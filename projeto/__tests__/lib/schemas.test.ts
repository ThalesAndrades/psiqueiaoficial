/**
 * Zod schema sanity tests.
 *
 * Goal: pin down the shape contract so that adjusting the runtime schemas
 * without touching the matching TS interface (or vice-versa) trips a test
 * instead of producing silent prod drift.
 */
import {
  UserProfileSchema,
  PsychologistProfileSchema,
  AppointmentSchema,
  DiaryEntrySchema,
  TransactionWithRelationsSchema,
} from '../../lib/schemas';

const UUID = '123e4567-e89b-12d3-a456-426614174000';
const UUID_2 = '00000000-0000-0000-0000-000000000001';
const ISO = '2025-01-01T00:00:00.000Z';

describe('UserProfileSchema', () => {
  it('accepts a well-formed patient profile', () => {
    const result = UserProfileSchema.safeParse({
      id: UUID,
      email: 'patient@example.com',
      full_name: 'Maria Silva',
      user_type: 'patient',
      onboarding_completed: true,
      created_at: ISO,
      updated_at: ISO,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown user_type', () => {
    const result = UserProfileSchema.safeParse({
      id: UUID,
      email: 'someone@example.com',
      full_name: 'X',
      user_type: 'admin', // not in the literal union
      onboarding_completed: false,
      created_at: ISO,
      updated_at: ISO,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing required field', () => {
    const result = UserProfileSchema.safeParse({
      id: UUID,
      // email missing
      full_name: 'Maria',
      user_type: 'patient',
      onboarding_completed: true,
      created_at: ISO,
      updated_at: ISO,
    });
    expect(result.success).toBe(false);
  });
});

describe('PsychologistProfileSchema', () => {
  it('parses a minimal psychologist profile with session_duration', () => {
    const result = PsychologistProfileSchema.safeParse({
      id: UUID,
      user_id: UUID_2,
      crp: '06/12345',
      specializations: ['TCC'],
      available_days: ['mon', 'wed'],
      available_hours: { mon: ['09:00', '10:00'] },
      rating: 4.8,
      total_sessions: 120,
      stripe_onboarding_completed: true,
      session_duration: 50,
    });
    expect(result.success).toBe(true);
  });
});

describe('AppointmentSchema', () => {
  it('parses a confirmed paid appointment', () => {
    const result = AppointmentSchema.safeParse({
      id: UUID,
      patient_id: UUID,
      psychologist_id: UUID_2,
      scheduled_at: ISO,
      duration_minutes: 50,
      status: 'confirmed',
      payment_status: 'paid',
      created_at: ISO,
      updated_at: ISO,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown status value', () => {
    const result = AppointmentSchema.safeParse({
      id: UUID,
      patient_id: UUID,
      psychologist_id: UUID_2,
      scheduled_at: ISO,
      duration_minutes: 50,
      status: 'rescheduled', // not in the union
      payment_status: 'paid',
      created_at: ISO,
      updated_at: ISO,
    });
    expect(result.success).toBe(false);
  });
});

describe('DiaryEntrySchema', () => {
  it('accepts each valid mood literal', () => {
    const moods = ['muito_bem', 'bem', 'neutro', 'mal', 'muito_mal'] as const;
    for (const mood of moods) {
      const result = DiaryEntrySchema.safeParse({
        id: UUID,
        patient_id: UUID_2,
        entry_date: ISO,
        mood,
        emotions: [],
        attachments: [],
        is_shared: false,
        created_at: ISO,
        updated_at: ISO,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an unknown mood literal', () => {
    const result = DiaryEntrySchema.safeParse({
      id: UUID,
      patient_id: UUID_2,
      entry_date: ISO,
      mood: 'feliz', // not in the union
      emotions: [],
      attachments: [],
      is_shared: false,
      created_at: ISO,
      updated_at: ISO,
    });
    expect(result.success).toBe(false);
  });

  it('coerces a missing mood as optional', () => {
    const result = DiaryEntrySchema.safeParse({
      id: UUID,
      patient_id: UUID_2,
      entry_date: ISO,
      emotions: ['ansiedade'],
      attachments: [],
      is_shared: false,
      created_at: ISO,
      updated_at: ISO,
    });
    expect(result.success).toBe(true);
  });
});

describe('TransactionWithRelationsSchema', () => {
  // Amount may legitimately be number, string (PostgREST numeric), or null.
  it.each([
    [42],
    ['42.50'],
    [null],
  ])('accepts amount %p', (amount) => {
    const result = TransactionWithRelationsSchema.safeParse({
      id: UUID,
      psychologist_id: UUID_2,
      transaction_type: 'session_payment',
      amount,
      currency: 'BRL',
      status: 'completed',
      transaction_date: ISO,
      created_at: ISO,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown transaction_type', () => {
    const result = TransactionWithRelationsSchema.safeParse({
      id: UUID,
      psychologist_id: UUID_2,
      transaction_type: 'gift',
      amount: 0,
      currency: 'BRL',
      status: 'completed',
      transaction_date: ISO,
      created_at: ISO,
    });
    expect(result.success).toBe(false);
  });
});
