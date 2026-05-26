import { supabase } from '../lib/supabase';

export interface Appointment {
  id: string;
  patient_id: string;
  psychologist_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  session_notes?: string;
  patient_notes?: string;
  meeting_link?: string;
  meet_link?: string;
  google_calendar_event_id?: string;
  google_meet_link?: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  amount?: number;
  session_price?: number;
  created_at: string;
  updated_at: string;
}

export const appointmentService = {
  async getAppointments(userId: string, userType: 'patient' | 'psychologist') {
    try {
      const column = userType === 'patient' ? 'patient_id' : 'psychologist_id';
      
      // OPTIMIZED: Only load next 30 days + limit to 50 records
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          psychologist_id,
          scheduled_at,
          duration_minutes,
          status,
          payment_status,
          amount,
          meeting_link,
          google_meet_link,
          patient:patient_id (id, full_name, avatar_url),
          psychologist:psychologist_id (id, full_name, avatar_url)
        `)
        .eq(column, userId)
        .gte('scheduled_at', today.toISOString())
        .lte('scheduled_at', futureDate.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(50);

      if (error) throw new Error(error.message);
      return { data: data as any[] || [], error: null };
    } catch (err: any) {
      console.error('[AppointmentService] getAppointments failed:', { userId, userType, error: err.message });
      return { data: [], error: err.message || 'Erro ao carregar agendamentos' };
    }
  },

  async createAppointment(appointmentData: Partial<Appointment>) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { data: data as Appointment, error: null };
    } catch (err: any) {
      console.error('[AppointmentService] createAppointment failed:', { error: err.message });
      return { data: null, error: err.message || 'Erro ao criar agendamento' };
    }
  },

  async getAvailableSlots(psychologistId: string, date: string) {
    try {
      // Get psychologist's available hours
      const { data: psychProfile, error: psychError } = await supabase
        .from('psychologist_profiles')
        .select('available_hours')
        .eq('user_id', psychologistId)
        .single();

      if (psychError) throw new Error(psychError.message);

      // Get existing appointments for this date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('scheduled_at, duration_minutes')
        .eq('psychologist_id', psychologistId)
        .gte('scheduled_at', startOfDay.toISOString())
        .lte('scheduled_at', endOfDay.toISOString())
        .in('status', ['scheduled', 'confirmed']);

      if (aptError) throw new Error(aptError.message);

      return { data: { availableHours: psychProfile.available_hours, bookedSlots: appointments || [] }, error: null };
    } catch (err: any) {
      console.error('[AppointmentService] getAvailableSlots failed:', { psychologistId, date, error: err.message });
      return { data: null, error: err.message || 'Erro ao carregar horários disponíveis' };
    }
  },

  async updateAppointment(appointmentId: string, updates: Partial<Appointment>) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { data: data as Appointment, error: null };
    } catch (err: any) {
      console.error('[AppointmentService] updateAppointment failed:', { appointmentId, error: err.message });
      return { data: null, error: err.message || 'Erro ao atualizar agendamento' };
    }
  },

  async cancelAppointment(appointmentId: string) {
    return await appointmentService.updateAppointment(appointmentId, {
      status: 'cancelled',
    });
  },

  async getAppointmentById(appointmentId: string) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patient_id (id, full_name, email, avatar_url),
          psychologist:psychologist_id (id, full_name, email, avatar_url)
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw new Error(error.message);
      return { data: data as Appointment & { patient: any; psychologist: any }, error: null };
    } catch (err: any) {
      console.error('[AppointmentService] getAppointmentById failed:', { appointmentId, error: err.message });
      return { data: null, error: err.message || 'Erro ao carregar agendamento' };
    }
  },

  async getUpcomingAppointments(userId: string, userType: 'patient' | 'psychologist') {
    try {
      const column = userType === 'patient' ? 'patient_id' : 'psychologist_id';
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patient_id (id, full_name, avatar_url),
          psychologist:psychologist_id (id, full_name, avatar_url)
        `)
        .eq(column, userId)
        .gte('scheduled_at', new Date().toISOString())
        .in('status', ['scheduled', 'confirmed'])
        .order('scheduled_at', { ascending: true });

      if (error) throw new Error(error.message);
      return { data: data as any[] || [], error: null };
    } catch (err: any) {
      console.error('[AppointmentService] getUpcomingAppointments failed:', { userId, userType, error: err.message });
      return { data: [], error: err.message || 'Erro ao carregar próximos agendamentos' };
    }
  },
};
