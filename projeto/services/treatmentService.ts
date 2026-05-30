import { supabase } from '../lib/supabase';

export interface TreatmentPlan {
  id: string;
  patient_id: string;
  psychologist_id: string;
  plan_name: string;
  description?: string;
  goals: string[];
  strategies: string[];
  frequency?: string;
  duration_weeks?: number;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export const treatmentService = {
  async getTreatmentPlans(userId: string, userType: 'patient' | 'psychologist') {
    try {
      const column = userType === 'patient' ? 'patient_id' : 'psychologist_id';
      
      const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          patient:patient_id (id, full_name, avatar_url),
          psychologist:psychologist_id (id, full_name, avatar_url)
        `)
        .eq(column, userId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return { data: (data as TreatmentPlan[] | null) ?? [], error: null };
    } catch (err: any) {
      console.error('[TreatmentService] getTreatmentPlans failed:', { userId, userType, error: err.message });
      return { data: [], error: err.message || 'Erro ao carregar planos de tratamento' };
    }
  },

  async createTreatmentPlan(planData: Partial<TreatmentPlan>) {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .insert(planData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { data: data as TreatmentPlan, error: null };
    } catch (err: any) {
      console.error('[TreatmentService] createTreatmentPlan failed:', { error: err.message });
      return { data: null, error: err.message || 'Erro ao criar plano de tratamento' };
    }
  },

  async updateTreatmentPlan(planId: string, updates: Partial<TreatmentPlan>) {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', planId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { data: data as TreatmentPlan, error: null };
    } catch (err: any) {
      console.error('[TreatmentService] updateTreatmentPlan failed:', { planId, error: err.message });
      return { data: null, error: err.message || 'Erro ao atualizar plano de tratamento' };
    }
  },

  async getActiveTreatmentPlan(patientId: string, psychologistId: string) {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', patientId)
        .eq('psychologist_id', psychologistId)
        .eq('status', 'active')
        .single();

      if (error) throw new Error(error.message);
      return { data: data as TreatmentPlan, error: null };
    } catch (err: any) {
      console.error('[TreatmentService] getActiveTreatmentPlan failed:', { patientId, psychologistId, error: err.message });
      return { data: null, error: err.message || 'Erro ao carregar plano ativo' };
    }
  },
};
