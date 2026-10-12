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

export const setupCommandSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(80).optional(),
});

export const signInCommandSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});
