import { z } from 'zod';

/**
 * Mood literal union — must stay in sync with `diaryService.DiaryEntry.mood`.
 * The values are Portuguese keys used by the bem-estar screens.
 */
export const DiaryMoodSchema = z.enum([
  'muito_bem',
  'bem',
  'neutro',
  'mal',
  'muito_mal',
]);

export type DiaryMood = z.infer<typeof DiaryMoodSchema>;

export const DiaryEntrySchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  entry_date: z.string(),
  mood: DiaryMoodSchema.optional(),
  // 1–10 in the UI; keep the schema permissive in case a future version
  // widens the range.
  mood_intensity: z.number().int().min(0).max(10).optional(),
  emotions: z.array(z.string()),
  content: z.string().optional(),
  attachments: z.array(z.string()),
  is_shared: z.boolean(),
  shared_with: z.string().uuid().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type DiaryEntryFromSchema = z.infer<typeof DiaryEntrySchema>;
