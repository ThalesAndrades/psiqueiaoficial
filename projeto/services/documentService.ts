import { supabase } from '../lib/supabase';

export interface SharedDocument {
  id: string;
  psychologist_id: string;
  patient_id?: string;
  google_drive_id: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  drive_url: string;
  thumbnail_url?: string;
  description?: string;
  shared_at: string;
  created_at: string;
  updated_at: string;
}

export const documentService = {
  /**
   * Get shared documents for current user (patient or psychologist)
   */
  async getSharedDocuments(): Promise<{ data: SharedDocument[] | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: 'Não autenticado' };
      }

      const { data, error } = await supabase
        .from('shared_documents')
        .select(`
          *,
          psychologist:psychologist_id (id, full_name, avatar_url),
          patient:patient_id (id, full_name, avatar_url)
        `)
        .or(`psychologist_id.eq.${user.id},patient_id.eq.${user.id}`)
        .order('shared_at', { ascending: false });

      if (error) throw new Error(error.message);
      return { data: (data as SharedDocument[] | null) ?? [], error: null };
    } catch (err: any) {
      console.error('[DocumentService] getSharedDocuments failed:', err.message);
      return { data: [], error: err.message || 'Erro ao carregar documentos compartilhados' };
    }
  },

  /**
   * Get documents shared by a specific psychologist
   */
  async getDocumentsByPsychologist(psychologistId: string): Promise<{ data: SharedDocument[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('shared_documents')
        .select(`
          *,
          patient:patient_id (id, full_name, avatar_url)
        `)
        .eq('psychologist_id', psychologistId)
        .order('shared_at', { ascending: false });

      if (error) throw new Error(error.message);
      return { data: (data as SharedDocument[] | null) ?? [], error: null };
    } catch (err: any) {
      console.error('[DocumentService] getDocumentsByPsychologist failed:', err.message);
      return { data: [], error: err.message || 'Erro ao carregar documentos' };
    }
  },

  /**
   * Get documents shared with a specific patient
   */
  async getDocumentsForPatient(patientId: string): Promise<{ data: SharedDocument[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('shared_documents')
        .select(`
          *,
          psychologist:psychologist_id (id, full_name, avatar_url)
        `)
        .eq('patient_id', patientId)
        .order('shared_at', { ascending: false });

      if (error) throw new Error(error.message);
      return { data: (data as SharedDocument[] | null) ?? [], error: null };
    } catch (err: any) {
      console.error('[DocumentService] getDocumentsForPatient failed:', err.message);
      return { data: [], error: err.message || 'Erro ao carregar documentos' };
    }
  },

  /**
   * Delete a shared document
   */
  async deleteDocument(documentId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('shared_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw new Error(error.message);
      return { error: null };
    } catch (err: any) {
      console.error('[DocumentService] deleteDocument failed:', { documentId, error: err.message });
      return { error: err.message || 'Erro ao excluir documento' };
    }
  },

  /**
   * Update document description
   */
  async updateDocument(documentId: string, updates: { description?: string }): Promise<{ data: SharedDocument | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('shared_documents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { data: data as SharedDocument, error: null };
    } catch (err: any) {
      console.error('[DocumentService] updateDocument failed:', { documentId, error: err.message });
      return { data: null, error: err.message || 'Erro ao atualizar documento' };
    }
  },
};
