import { supabase } from '../lib/supabase';

export interface PatientPsychologistRelation {
  id: string;
  patient_id: string;
  psychologist_id: string;
  status: 'active' | 'inactive' | 'pending';
  started_at: string;
  ended_at?: string;
  created_at: string;
}

export const patientPsychologistService = {
  async getMyPsychologist(patientId: string) {
    try {
      const { data, error } = await supabase
        .from('patient_psychologist')
        .select(`
          *,
          psychologist:psychologist_id (
            id,
            full_name,
            avatar_url,
            user_type
          ),
          psychologist_profile:psychologist_id (
            crp,
            specializations,
            bio,
            session_price,
            rating,
            total_sessions
          )
        `)
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .single();

      if (error) throw new Error(error.message);
      return { data, error: null };
    } catch (err: any) {
      console.error('[PatientPsychologistService] getMyPsychologist failed:', { patientId, error: err.message });
      return { data: null, error: err.message || 'Erro ao carregar psicólogo' };
    }
  },

  async getMyPatients(psychologistId: string) {
    try {
      const { data, error } = await supabase
        .from('patient_psychologist')
        .select(`
          *,
          patient:patient_id (
            id,
            full_name,
            avatar_url,
            phone,
            birth_date
          )
        `)
        .eq('psychologist_id', psychologistId)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (error) throw new Error(error.message);
      return { data: data || [], error: null };
    } catch (err: any) {
      console.error('[PatientPsychologistService] getMyPatients failed:', { psychologistId, error: err.message });
      return { data: [], error: err.message || 'Erro ao carregar pacientes' };
    }
  },

  async createRelation(patientId: string, psychologistId: string) {
    try {
      const { data, error } = await supabase
        .from('patient_psychologist')
        .insert({
          patient_id: patientId,
          psychologist_id: psychologistId,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { data: data as PatientPsychologistRelation, error: null };
    } catch (err: any) {
      console.error('[PatientPsychologistService] createRelation failed:', { patientId, psychologistId, error: err.message });
      return { data: null, error: err.message || 'Erro ao criar relação' };
    }
  },

  async updateRelationStatus(
    relationId: string,
    status: 'active' | 'inactive' | 'pending'
  ) {
    try {
      const updates: any = { status };
      if (status === 'inactive') {
        updates.ended_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('patient_psychologist')
        .update(updates)
        .eq('id', relationId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { data: data as PatientPsychologistRelation, error: null };
    } catch (err: any) {
      console.error('[PatientPsychologistService] updateRelationStatus failed:', { relationId, status, error: err.message });
      return { data: null, error: err.message || 'Erro ao atualizar status da relação' };
    }
  },
};
