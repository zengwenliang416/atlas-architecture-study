export const LEVELS = ['new', 'vague', 'mastered'] as const;
export type Level = (typeof LEVELS)[number];

export const REVIEW_INTERVALS = [0, 1, 2, 4, 7, 15, 30] as const;
export const MAX_STAGE = REVIEW_INTERVALS.length - 1;
export const LEGACY_STORAGE_KEY = 'architecture_review_focused_notes_v2';
export const NOTE_LIMIT = 20_000;

export type DomainErrorCode = 'invalid_level' | 'invalid_notes';

export type DomainError = {
  code: DomainErrorCode;
  message: string;
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: DomainError };

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}
