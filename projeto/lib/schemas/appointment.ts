import { z } from 'zod';

// Status enums alinhados com os CHECK constraints do schema SQL em
// supabase/migrations/20260101000000_initial_schema.sql:136-141. Manter em
// sincronia — divergência quebra Zod.parse() em leituras válidas.
export const AppointmentStatusSchema = z.enum([
  'pending',
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);

export const PaymentStatusSchema = z.enum(['unpaid', 'pending', 'paid', 'refunded']);

export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  psychologist_id: z.string().uuid(),
  scheduled_at: z.string(),
  duration_minutes: z.number().int().positive(),
  status: AppointmentStatusSchema,
  session_notes: z.string().optional(),
  patient_notes: z.string().optional(),
  meeting_link: z.string().url().optional(),
  meet_link: z.string().url().optional(),
  google_calendar_event_id: z.string().optional(),
  google_meet_link: z.string().url().optional(),
  payment_status: PaymentStatusSchema,
  amount: z.number().optional(),
  session_price: z.number().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AppointmentFromSchema = z.infer<typeof AppointmentSchema>;
