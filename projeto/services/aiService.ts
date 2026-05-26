import { supabase } from '../lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

export type AIRequestType = 
  | 'chat' 
  | 'insight' 
  | 'analysis' 
  | 'recommendation' 
  | 'mood_analysis' 
  | 'treatment_suggestion';

export interface AIRequest {
  type: AIRequestType;
  context?: any;
  message?: string;
  userId?: string;
  stream?: boolean;
}

export interface AIResponse {
  response: string;
  type: AIRequestType;
}

const handleFunctionError = async (error: any): Promise<string> => {
  let errorMessage = error.message || 'Erro desconhecido';
  
  if (error instanceof FunctionsHttpError) {
    try {
      const statusCode = error.context?.status ?? 500;
      const textContent = await error.context?.text();
      errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Erro ao processar requisição'}`;
    } catch {
      errorMessage = error.message || 'Erro ao processar requisição';
    }
  }
  
  return errorMessage;
};

export const aiService = {
  async chat(message: string, context?: any): Promise<{ data: AIResponse | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke<AIResponse>('ai-agent', {
        body: {
          type: 'chat',
          message,
          context,
          userId: user?.id,
        } as AIRequest,
      });

      if (error) {
        const errorMessage = await handleFunctionError(error);
        console.error('AI chat error:', errorMessage);
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('AI chat exception:', err);
      return { data: null, error: err.message || 'Erro ao processar chat' };
    }
  },

  async getDailyInsight(userContext?: any): Promise<{ data: AIResponse | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke<AIResponse>('ai-agent', {
        body: {
          type: 'insight',
          context: userContext,
          userId: user?.id,
        } as AIRequest,
      });

      if (error) {
        const errorMessage = await handleFunctionError(error);
        console.error('AI insight error:', errorMessage);
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('AI insight exception:', err);
      return { data: null, error: err.message || 'Erro ao gerar insight' };
    }
  },

  async analyzeMood(diaryEntries: any[]): Promise<{ data: AIResponse | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke<AIResponse>('ai-agent', {
        body: {
          type: 'mood_analysis',
          context: { entries: diaryEntries },
          userId: user?.id,
        } as AIRequest,
      });

      if (error) {
        const errorMessage = await handleFunctionError(error);
        console.error('AI mood analysis error:', errorMessage);
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('AI mood analysis exception:', err);
      return { data: null, error: err.message || 'Erro ao analisar humor' };
    }
  },

  async getRecommendations(userContext: any): Promise<{ data: AIResponse | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke<AIResponse>('ai-agent', {
        body: {
          type: 'recommendation',
          context: userContext,
          userId: user?.id,
        } as AIRequest,
      });

      if (error) {
        const errorMessage = await handleFunctionError(error);
        console.error('AI recommendations error:', errorMessage);
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('AI recommendations exception:', err);
      return { data: null, error: err.message || 'Erro ao gerar recomendações' };
    }
  },

  async analyzeTreatment(patientData: any): Promise<{ data: AIResponse | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke<AIResponse>('ai-agent', {
        body: {
          type: 'analysis',
          context: patientData,
          userId: user?.id,
        } as AIRequest,
      });

      if (error) {
        const errorMessage = await handleFunctionError(error);
        console.error('AI treatment analysis error:', errorMessage);
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('AI treatment analysis exception:', err);
      return { data: null, error: err.message || 'Erro ao analisar tratamento' };
    }
  },

  async suggestTreatmentPlan(patientProfile: any): Promise<{ data: AIResponse | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke<AIResponse>('ai-agent', {
        body: {
          type: 'treatment_suggestion',
          context: patientProfile,
          userId: user?.id,
        } as AIRequest,
      });

      if (error) {
        const errorMessage = await handleFunctionError(error);
        console.error('AI treatment suggestion error:', errorMessage);
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('AI treatment suggestion exception:', err);
      return { data: null, error: err.message || 'Erro ao sugerir plano de tratamento' };
    }
  },

  async streamChat(
    message: string,
    context: any,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onError('Não autenticado');
        return;
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-agent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'chat',
          message,
          context,
          stream: true,
        } as AIRequest),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        onError(errorText);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('Streaming não suportado');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e: unknown) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }

      onComplete();
    } catch (error: any) {
      if (error?.name === 'AbortError') return; // caller cancelled
      console.error('Stream chat error:', error);
      onError(error.message || 'Erro ao processar chat');
    }
  },
};
