import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface AIRequest {
  type: 'chat' | 'insight' | 'analysis' | 'recommendation' | 'mood_analysis' | 'treatment_suggestion';
  context?: any;
  message?: string;
  userId?: string;
  stream?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Initialize Supabase client with user context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader ?? '' } } }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AIRequest = await req.json();
    const { type, context, message, stream = false } = body;
    // user_id is always derived from the auth token — never trust the body.
    const userId = user.id;

    console.log(`AI Agent request - Type: ${type}, User: ${user.id}`);

    // Get OnSpace AI credentials
    const aiApiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const aiBaseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!aiApiKey || !aiBaseUrl) {
      console.error('OnSpace AI credentials missing');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt based on request type
    const systemPrompt = buildSystemPrompt(type, context);
    const userPrompt = message || buildUserPrompt(type, context);

    console.log('Calling OnSpace AI...');

    // Call OnSpace AI
    const aiResponse = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500, // Reduzido de 2000 para forçar respostas mais curtas
        stream: stream,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OnSpace AI error:', errorText);
      return new Response(
        JSON.stringify({ error: `AI service error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle streaming response
    if (stream) {
      return new Response(aiResponse.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle non-streaming response
    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';

    // Store interaction in database for future learning
    if (userId) {
      await supabase.from('ai_interactions').insert({
        user_id: userId,
        interaction_type: type,
        context: context,
        user_message: message,
        ai_response: aiMessage,
      });
    }

    console.log('AI Agent response generated successfully');

    return new Response(
      JSON.stringify({ 
        response: aiMessage,
        type: type,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('AI Agent error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildSystemPrompt(type: string, context: any): string {
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

function buildUserPrompt(type: string, context: any): string {
  const userName = context?.userName || 'você';
  const progress = context?.progress || 0;

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
