import { z } from 'zod';
import { NOTE_LIMIT } from './errors.js';

export const levelSchema = z.enum(['new', 'vague', 'mastered']);
export const notesSchema = z.tuple([
  z.string().max(NOTE_LIMIT),
  z.string().max(NOTE_LIMIT),
  z.string().max(NOTE_LIMIT),
]);
export const versionSchema = z.number().int().nonnegative();
export const questionIdSchema = z.string().regex(/^Q\d+$/);

export const notesCommandSchema = z.object({
  version: versionSchema,
  notes: notesSchema,
});

export const levelCommandSchema = z.object({
  version: versionSchema,
  level: levelSchema,
});

export const importCommandSchema = z.object({
  records: z.record(z.string(), z.unknown()),
});

export const attemptSchema = z.array(z.enum(['right', 'wrong', 'skip', 'open'])).min(1).max(16);

export const essayCommandSchema = z.object({
  version: versionSchema,
  essayDraft: z.string().max(NOTE_LIMIT),
});

export const attemptChoiceSchema = z.union([z.string().regex(/^[A-Z]$/), z.null()]);

export const attemptsCommandSchema = z.object({
  items: z
    .array(
      z.object({
        questionId: questionIdSchema,
        version: versionSchema,
        attempt: attemptSchema,
        choices: z.array(attemptChoiceSchema).min(1).max(16),
      }),
    )
    .min(1)
    .max(64),
});

export const setupCommandSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(80).optional(),
});

export const signInCommandSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});
