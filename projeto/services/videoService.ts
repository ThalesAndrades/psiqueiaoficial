import { supabase } from '../lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface DailyRoomResult {
  url: string;
  name?: string;
  reused?: boolean;
}

async function extractErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const statusCode = error.context?.status ?? 500;
      const textContent = await error.context?.text();
      return `[Code: ${statusCode}] ${textContent || error.message || fallback}`;
    } catch {
      return error.message || fallback;
    }
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

/**
 * Thin client wrapper around the `daily-rooms` Edge Function. All Daily.co
 * REST calls happen server-side; the mobile bundle only ever sees a final
 * room URL ready to be passed to `@daily-co/react-native-daily-js`.
 */
export const videoService = {
  /**
   * Create (or reuse) a Daily.co room for an appointment. The Edge Function
   * is idempotent — calling this multiple times for the same appointment
   * returns the same URL until the room is explicitly deleted.
   */
  async createRoom(appointmentId: string): Promise<{ data: DailyRoomResult | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('daily-rooms', {
        body: { action: 'create', appointmentId },
      });

      if (error) {
        return { data: null, error: await extractErrorMessage(error, 'Falha ao gerar a sala de vídeo') };
      }
      if (!data?.url) {
        return { data: null, error: 'Resposta inválida do servidor de vídeo' };
      }
      return { data, error: null };
    } catch (error: unknown) {
      console.error('[videoService] createRoom error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Falha ao gerar a sala de vídeo' };
    }
  },

  /**
   * Delete the Daily.co room for an appointment. Currently invoked when a
   * session is cancelled. Safe to call when no room exists.
   */
  async deleteRoom(appointmentId: string): Promise<{ data: { deleted: boolean } | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('daily-rooms', {
        body: { action: 'delete', appointmentId },
      });

      if (error) {
        return { data: null, error: await extractErrorMessage(error, 'Falha ao remover a sala de vídeo') };
      }
      return { data, error: null };
    } catch (error: unknown) {
      console.error('[videoService] deleteRoom error:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Falha ao remover a sala de vídeo' };
    }
  },
};
