import { z } from 'zod';

export const TransactionTypeSchema = z.enum([
  'session_payment',
  'subscription',
  'refund',
  'payout',
]);

export const TransactionStatusSchema = z.enum([
  'pending',
  'completed',
  'failed',
  'refunded',
]);

/**
 * Amount is `number | string | null` because PostgREST serialises `numeric`
 * columns as strings by default. The prior bug fix to `financialService`
 * documented this — keep the schema in lock-step.
 */
const AmountSchema = z.union([z.number(), z.string(), z.null()]);

export const FinancialTransactionSchema = z.object({
  id: z.string().uuid(),
  psychologist_id: z.string().uuid(),
  patient_id: z.string().uuid().optional(),
  appointment_id: z.string().uuid().optional(),
  transaction_type: TransactionTypeSchema,
  amount: AmountSchema,
  currency: z.string(),
  status: TransactionStatusSchema,
  stripe_payment_id: z.string().optional(),
  stripe_payout_id: z.string().optional(),
  description: z.string().optional(),
  transaction_date: z.string(),
  created_at: z.string(),
});

export const TransactionWithRelationsSchema = FinancialTransactionSchema.extend({
  patient: z
    .object({
      id: z.string().uuid(),
      full_name: z.string(),
      avatar_url: z.string().url().optional(),
    })
    .optional(),
  appointment: z
    .object({
      scheduled_at: z.string(),
    })
    .optional(),
});

export type TransactionWithRelationsFromSchema = z.infer<typeof TransactionWithRelationsSchema>;
