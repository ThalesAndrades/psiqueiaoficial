import { z } from 'zod';

/**
 * Runtime schemas mirroring the TS interfaces in `services/profileService.ts`.
 *
 * These exist alongside the compile-time interfaces (not as a replacement):
 *   - The interfaces stay where they are so existing imports keep working
 *     and TS errors still surface at build time.
 *   - The schemas parse untrusted runtime data — Supabase JSON, deep-link
 *     query params, server-driven config — and turn shape mismatches into
 *     loud errors instead of `undefined.foo` crashes.
 */
export const UserTypeSchema = z.enum(['patient', 'psychologist']);

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().min(1),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  avatar_url: z.string().url().optional(),
  user_type: UserTypeSchema,
  onboarding_completed: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type UserProfileFromSchema = z.infer<typeof UserProfileSchema>;

export const PsychologistProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  crp: z.string().min(1),
  specializations: z.array(z.string()),
  bio: z.string().optional(),
  session_price: z.number().nonnegative().optional(),
  // Duration of a session in minutes. Optional because legacy rows may not
  // have it; defaults to 50 in the UI when missing.
  session_duration: z.number().int().positive().optional(),
  approach: z.string().optional(),
  available_days: z.array(z.string()),
  // `available_hours` is stored as JSONB and the shape varies between
  // versions of the editar-perfil screen — keep it permissive at the
  // schema boundary and let the consumer narrow further.
  available_hours: z.any(),
  rating: z.number(),
  total_sessions: z.number().int().nonnegative(),
  stripe_account_id: z.string().optional(),
  stripe_onboarding_completed: z.boolean(),
});

export type PsychologistProfileFromSchema = z.infer<typeof PsychologistProfileSchema>;
