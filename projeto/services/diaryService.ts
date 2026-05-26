import { supabase } from '../lib/supabase';

export interface DiaryEntry {
  id: string;
  patient_id: string;
  entry_date: string;
  mood?: 'muito_bem' | 'bem' | 'neutro' | 'mal' | 'muito_mal';
  mood_intensity?: number;
  emotions: string[];
  content?: string;
  attachments: string[];
  is_shared: boolean;
  shared_with?: string;
  created_at: string;
  updated_at: string;
}

export const diaryService = {
  async getDiaryEntries(patientId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('diary_entries')
      .select('*')
      .eq('patient_id', patientId)
      .order('entry_date', { ascending: false });

    if (startDate) {
      query = query.gte('entry_date', startDate);
    }
    if (endDate) {
      query = query.lte('entry_date', endDate);
    }

    const { data, error } = await query;

    if (error) return { data: null, error: error.message };
    return { data: data as DiaryEntry[], error: null };
  },

  async createDiaryEntry(entryData: Partial<DiaryEntry>) {
    const { data, error } = await supabase
      .from('diary_entries')
      .insert(entryData)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as DiaryEntry, error: null };
  },

  async updateDiaryEntry(entryId: string, updates: Partial<DiaryEntry>) {
    const { data, error } = await supabase
      .from('diary_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as DiaryEntry, error: null };
  },

  async deleteDiaryEntry(entryId: string) {
    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', entryId);

    if (error) return { error: error.message };
    return { error: null };
  },

  async getSharedEntries(psychologistId: string) {
    const { data, error } = await supabase
      .from('diary_entries')
      .select(`
        *,
        patient:patient_id (id, full_name, avatar_url)
      `)
      .eq('shared_with', psychologistId)
      .eq('is_shared', true)
      .order('entry_date', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },
};
