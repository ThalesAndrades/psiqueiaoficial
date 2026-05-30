import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import { UserProfileSchema } from '../lib/schemas/user';
import { logger } from './loggerService';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  birth_date?: string;
  avatar_url?: string;
  user_type: 'patient' | 'psychologist';
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PsychologistProfile {
  id: string;
  user_id: string;
  crp: string;
  // Número do registro CFP no formato "UF/NNNNNN" (ex.: "06/123456"). Opcional
  // porque psicólogos cadastrados antes do campo existir ainda têm a coluna nula.
  cfp_number?: string;
  specializations: string[];
  bio?: string;
  session_price?: number;
  // Duration of a session in minutes (set in the editar-perfil screen,
  // defaults to 50). Optional because legacy rows may not have it.
  session_duration?: number;
  // Free-text therapeutic approach (TCC, Psicanálise, etc.).
  approach?: string;
  available_days: string[];
  available_hours: any;
  rating: number;
  total_sessions: number;
  stripe_account_id?: string;
  stripe_onboarding_completed: boolean;
}

export const profileService = {
  async getUserProfile(userId: string) {
    console.log('[ProfileService] getUserProfile called with userId:', userId);
    try {
      // OPTIMIZED: SELECT only needed fields (faster query)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, phone, birth_date, avatar_url, user_type, onboarding_completed, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[ProfileService] getUserProfile FAILED:', { userId, error: error.message, code: error.code, details: error.details });
        return { data: null, error: error.message };
      }
      
      if (!data) {
        console.error('[ProfileService] getUserProfile NO DATA RETURNED for userId:', userId);
        return { data: null, error: 'Perfil não encontrado' };
      }

      // Zod boundary parse: garante que o dado vindo do banco bate com o
      // contrato TS. Em vez de cast `as UserProfile` (que mente em runtime),
      // safeParse erra alto se schema mudar e algum campo crítico vier
      // ausente/torto.
      const parsed = UserProfileSchema.safeParse(data);
      if (!parsed.success) {
        logger.error('ProfileService', 'getUserProfile schema mismatch', {
          userId,
          issues: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).slice(0, 5),
        });
        return { data: null, error: 'Perfil em formato inválido' };
      }
      return { data: parsed.data as UserProfile, error: null };
    } catch (err: any) {
      console.error('[ProfileService] getUserProfile EXCEPTION:', { userId, error: err.message, stack: err.stack });
      return { data: null, error: err.message || 'Erro ao carregar perfil' };
    }
  },

  async checkProfileExists(userId: string) {
    try {
      // Query direta para evitar problemas com RPC functions
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[ProfileService] checkProfileExists failed:', { userId, error: error.message });
        return { exists: false, error: error.message };
      }
      
      return { exists: !!data, error: null };
    } catch (err: any) {
      console.error('[ProfileService] checkProfileExists exception:', { userId, error: err.message });
      return { exists: false, error: err.message };
    }
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: 'Perfil não encontrado para atualização' };
    return { data: data as UserProfile, error: null };
  },

  // Alias for compatibility with onboarding screens
  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    return this.updateUserProfile(userId, updates);
  },

  async getPsychologistProfile(userId: string) {
    const { data, error } = await supabase
      .from('psychologist_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: 'Perfil de psicólogo não encontrado' };
    return { data: data as PsychologistProfile, error: null };
  },

  async createPsychologistProfile(userId: string, profileData: Partial<PsychologistProfile>) {
    try {
      const { data, error } = await supabase
        .from('psychologist_profiles')
        .insert({
          user_id: userId,
          ...profileData,
        })
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error('Falha ao criar perfil de psicólogo');
      return { data: data as PsychologistProfile, error: null };
    } catch (err: any) {
      console.error('[ProfileService] createPsychologistProfile failed:', { userId, error: err.message });
      return { data: null, error: err.message || 'Erro ao criar perfil de psicólogo' };
    }
  },

  async updatePsychologistProfile(userId: string, updates: Partial<PsychologistProfile>) {
    const { data, error } = await supabase
      .from('psychologist_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: 'Perfil de psicólogo não encontrado para atualização' };
    return { data: data as PsychologistProfile, error: null };
  },

  async getAllPsychologists() {
    const { data, error } = await supabase
      .from('psychologist_profiles')
      .select(`
        *,
        user_profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `);

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },

  async getPatientProfile(userId: string) {
    const { data, error } = await supabase
      .from('patient_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },

  async updatePatientProfile(userId: string, updates: any) {
    // Primeiro, verificar se o perfil existe
    const { data: existing } = await supabase
      .from('patient_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Atualizar perfil existente
      const { data, error } = await supabase
        .from('patient_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (error) return { data: null, error: error.message };
      return { data, error: null };
    } else {
      // Criar novo perfil
      const { data, error } = await supabase
        .from('patient_profiles')
        .insert({ user_id: userId, ...updates })
        .select()
        .maybeSingle();

      if (error) return { data: null, error: error.message };
      return { data, error: null };
    }
  },

  async uploadAvatar(userId: string, fileUri: string, fileType: string) {
    try {
      const fileExt = fileType.split('/')[1];
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      let fileData: Blob | ArrayBuffer;

      if (Platform.OS === 'web') {
        const response = await fetch(fileUri);
        fileData = await response.blob();
      } else {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        const reader = new FileReader();
        fileData = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });
      }

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, fileData, {
          contentType: fileType,
          upsert: true,
        });

      if (error) return { data: null, error: error.message };

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return { data: urlData.publicUrl, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  },
};
