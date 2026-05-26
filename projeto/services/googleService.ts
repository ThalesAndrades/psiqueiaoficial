import { supabase } from '../lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface GoogleMeetingResult {
  meetLink: string;
  appointmentId: string;
}

export interface GoogleFileInfo {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink: string;
  size?: string;
  createdTime: string;
}

export const googleService = {
  /**
   * Exchange OAuth code for tokens
   */
  async exchangeOAuthCode(code: string): Promise<{
    data: { success: boolean } | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('google-integration', {
        body: {
          action: 'exchange_oauth_code',
          code,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to exchange OAuth code'}`;
          }
        }
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error exchanging OAuth code:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Create a Google Meet link for an appointment
   */
  async createMeeting(appointmentData: {
    appointmentId: string;
    scheduledAt: string;
    duration: number;
    patientName: string;
    psychologistName: string;
    patientEmail: string;
    psychologistEmail: string;
  }): Promise<{ data: GoogleMeetingResult | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('google-integration', {
        body: {
          action: 'create_meeting',
          data: appointmentData,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to create meeting'}`;
          }
        }
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Create meeting error:', error);
      return { data: null, error: error.message || 'Failed to create meeting' };
    }
  },

  /**
   * Sync appointments with Google Calendar
   */
  async syncCalendar(syncData: {
    patientEmail?: string;
    psychologistEmail?: string;
  }): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('google-integration', {
        body: {
          action: 'sync_calendar',
          data: syncData,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to sync calendar'}`;
          }
        }
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Sync calendar error:', error);
      return { data: null, error: error.message || 'Failed to sync calendar' };
    }
  },

  /**
   * List files from Google Drive
   */
  async listDriveFiles(folderId?: string): Promise<{ data: GoogleFileInfo[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('google-integration', {
        body: {
          action: 'list_files',
          data: { folderId },
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to list files'}`;
          }
        }
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('List files error:', error);
      return { data: null, error: error.message || 'Failed to list files' };
    }
  },

  /**
   * Share a file from Google Drive with a patient
   */
  async shareFile(shareData: {
    fileId: string;
    fileName: string;
    patientId: string;
    description?: string;
  }): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('google-integration', {
        body: {
          action: 'share_file',
          data: shareData,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to share file'}`;
          }
        }
        return { data: null, error: errorMessage };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Share file error:', error);
      return { data: null, error: error.message || 'Failed to share file' };
    }
  },

  /**
   * Create a simple Google Meet link (without full calendar integration)
   * This is a fallback when full Google integration is not available
   */
  async createMeetLink(
    scheduledAt: string,
    durationMinutes: number,
    title: string
  ): Promise<{ data: string | null; error: string | null }> {
    try {
      // Tentar criar via Edge Function
      const { data, error } = await supabase.functions.invoke('google-integration', {
        body: {
          // The Edge Function dispatches on `create_meeting`; the legacy
          // 'create_meet_link' name went to the "Unknown action" branch and
          // 500'd silently before falling back to the placeholder below.
          action: 'create_meeting',
          data: {
            scheduledAt,
            durationMinutes,
            title,
          },
        },
      });

      if (error) {
        // Se falhar, gerar um link de placeholder que será atualizado posteriormente
        console.warn('Could not create Meet link via API, using placeholder:', error);
        
        // Gerar um ID único para o link de placeholder
        const meetId = Math.random().toString(36).substring(2, 15);
        const placeholderLink = `https://meet.google.com/${meetId.substring(0, 3)}-${meetId.substring(3, 7)}-${meetId.substring(7, 10)}`;
        
        return { data: placeholderLink, error: null };
      }

      return { data: data?.meetLink || data, error: null };
    } catch (error: any) {
      console.error('Create Meet link error:', error);
      
      // Fallback: gerar link de placeholder
      const meetId = Math.random().toString(36).substring(2, 15);
      const placeholderLink = `https://meet.google.com/${meetId.substring(0, 3)}-${meetId.substring(3, 7)}-${meetId.substring(7, 10)}`;
      
      return { data: placeholderLink, error: null };
    }
  },

  /**
   * Get shared documents for current user
   */
  async getSharedDocuments(): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: 'Not authenticated' };
      }

      const { data, error } = await supabase
        .from('shared_documents')
        .select('*')
        .or(`psychologist_id.eq.${user.id},patient_id.eq.${user.id}`)
        .order('shared_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Get shared documents error:', error);
      return { data: null, error: error.message || 'Failed to get documents' };
    }
  },
};
