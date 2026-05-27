// AI agent edge function. Routes user/psychologist requests to the Anthropic
// Messages API (Claude) and persists the interaction for later analysis.
//
// Replaces a previous integration with OnSpace AI (OpenAI-compatible gateway,
// google/gemini-2.5-flash). Migrated to the Anthropic API directly so we keep
// secrets server-side and gain prompt caching for the per-mode system prompt.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('ai-agent');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Default to the strongest available Claude model — see SKILL.md guidance.
// To reduce cost (mental-health workloads are high volume), set
// ANTHROPIC_MODEL=claude-sonnet-4-6 as an Edge Function secret. Both models
// support adaptive thinking and ephemeral cache control.
const DEFAULT_MODEL = 'claude-opus-4-7';

// Per-request output ceiling. The prompts ask for terse answers (3-4
// sentences), but adaptive thinking + the response need headroom — 1024 is a
// safe upper bound while still keeping costs in check.
const DEFAULT_MAX_TOKENS = 1024;

type RequestType =
  | 'chat'
  | 'insight'
  | 'analysis'
  | 'recommendation'
  | 'mood_analysis'
  | 'treatment_suggestion';

interface AIRequest {
  type: RequestType;
  context?: Record<string, unknown>;
  message?: string;
  userId?: string;
  stream?: boolean;
}

// Modes that benefit from a small amount of reasoning before answering.
// Chat is kept on direct generation to minimize first-token latency.
const ADAPTIVE_THINKING_TYPES = new Set<RequestType>([
  'analysis',
  'recommendation',
  'mood_analysis',
  'treatment_suggestion',
]);

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader ?? '' } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      log.error('Authentication error', { error: authError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AIRequest = await req.json();
    const { type, context, message, stream = false } = body;
    // user_id is always derived from the auth token — never trust the body.
    const userId = user.id;

    log.info('AI Agent request', { type, userId, stream });

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      log.error('ANTHROPIC_API_KEY missing');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const model = Deno.env.get('ANTHROPIC_MODEL') ?? DEFAULT_MODEL;
    const systemPrompt = buildSystemPrompt(type);
    const userPrompt = message?.trim() ? message : buildUserPrompt(type, context);

    // Build the request body for Anthropic's Messages API.
    //
    // Prompt caching: the system prompt is deterministic per `type`, so we
    // attach `cache_control: { type: "ephemeral" }` to it. The first call of
    // each type pays the cache write (~1.25x); subsequent calls of the same
    // type within 5min read at ~0.1x. See shared/prompt-caching.md.
    const anthropicBody: Record<string, unknown> = {
      model,
      max_tokens: DEFAULT_MAX_TOKENS,
      stream,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    };

    if (ADAPTIVE_THINKING_TYPES.has(type)) {
      anthropicBody.thinking = { type: 'adaptive' };
    }

    log.info('Calling Anthropic', { model, thinking: !!anthropicBody.thinking });

    const aiResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(anthropicBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      log.error('Anthropic API error', { status: aiResponse.status, body: errorText });
      return new Response(
        JSON.stringify({ error: `AI service error: ${aiResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (stream) {
      // Pass through Anthropic's native SSE stream. Note: the event format
      // differs from the previous OpenAI-shaped stream — clients consuming
      // this stream must parse `message_start`/`content_block_delta`/
      // `message_delta`/`message_stop` events per the Anthropic docs.
      return new Response(aiResponse.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const aiData = await aiResponse.json();
    const aiMessage = extractText(aiData);
    const usage = aiData?.usage as
      | {
          input_tokens?: number;
          output_tokens?: number;
          cache_creation_input_tokens?: number;
          cache_read_input_tokens?: number;
        }
      | undefined;

    // Persist for later analysis. Failure to log must not break the response.
    try {
      await supabase.from('ai_interactions').insert({
        user_id: userId,
        interaction_type: type,
        context,
        user_message: message,
        ai_response: aiMessage,
      });
    } catch (persistErr) {
      log.error('Failed to persist ai_interactions row', { error: persistErr });
    }

    log.info('AI Agent response generated', {
      type,
      input_tokens: usage?.input_tokens,
      output_tokens: usage?.output_tokens,
      cache_read_input_tokens: usage?.cache_read_input_tokens,
    });

    return new Response(
      JSON.stringify({ response: aiMessage, type }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    log.error('AI Agent error', { error });
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Anthropic's Messages API returns content as an array of blocks.
// Concatenate every text block; ignore thinking blocks (they're metadata).
function extractText(aiData: unknown): string {
  const fallback = 'Desculpe, não consegui gerar uma resposta.';
  if (!aiData || typeof aiData !== 'object') return fallback;
  const content = (aiData as { content?: Array<{ type: string; text?: string }> }).content;
  if (!Array.isArray(content)) return fallback;
  const text = content
    .filter((b) => b?.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text!)
    .join('')
    .trim();
  return text.length ? text : fallback;
}

// System prompt is stable per `type` so that prompt caching hits across calls
// of the same mode. Do not interpolate user-specific data here — that goes in
// the user prompt below.
function buildSystemPrompt(type: RequestType): string {
  const basePrompt = `Você é PsiquèIA, assistente de bem-estar emocional.

DIRETRIZES DE RESPOSTA:
- Seja CONCISO: máximo 3-4 frases curtas
- Use linguagem acolhedora e próxima
- Foque em ações práticas e imediatas
- Evite textos longos ou explicações teóricas
- Use emojis sutis quando apropriado (máximo 1-2)

LEMBRETE: Você complementa psicólogos, NÃO substitui. Incentive conversar com o profissional sobre questões importantes.`;

  switch (type) {
    case 'chat':
      return `${basePrompt}\n\nModo: Conversa de suporte. Responda de forma breve, empática e prática.`;
    case 'insight':
      return `${basePrompt}\n\nModo: Insight diário. Gere 2-3 frases motivacionais e personalizadas.`;
    case 'analysis':
      return `${basePrompt}\n\nModo: Análise rápida. Destaque 1-2 padrões principais de forma clara.`;
    case 'recommendation':
      return `${basePrompt}\n\nModo: Recomendações práticas. Liste 2-3 ações específicas e simples.`;
    case 'mood_analysis':
      return `${basePrompt}\n\nModo: Análise de humor. Identifique 1-2 padrões relevantes de forma objetiva.`;
    case 'treatment_suggestion':
      return `${basePrompt}\n\nModo: Sugestão terapêutica (para psicólogo). Liste 3-4 elementos práticos de plano de tratamento.`;
    default:
      return basePrompt;
  }
}

function buildUserPrompt(type: RequestType, context: Record<string, unknown> | undefined): string {
  const userName = (context?.userName as string) || 'você';
  const progress = (context?.progress as number) ?? 0;

  switch (type) {
    case 'insight':
      return `Gere um insight motivacional CURTO (máximo 3 frases) para ${userName}. Progresso: ${progress}%. Foque em encorajamento e próximos passos.`;
    case 'analysis':
      return `Análise RÁPIDA: identifique 1-2 padrões principais deste histórico em 2-3 frases: ${JSON.stringify(context)}`;
    case 'recommendation':
      return `Liste 2-3 ações PRÁTICAS e SIMPLES que ${userName} pode fazer hoje: ${JSON.stringify(context)}`;
    case 'mood_analysis':
      return `Análise OBJETIVA (2-3 frases): identifique o padrão mais relevante nestes registros: ${JSON.stringify(context)}`;
    case 'treatment_suggestion':
      return `Sugestão de plano: liste 3-4 elementos PRÁTICOS baseados neste perfil: ${JSON.stringify(context)}`;
    default:
      return 'Como posso ajudar você hoje?';
  }
}
