import { isIsoDate } from './calendar.js';
import { isLevel, MAX_STAGE, NOTE_LIMIT } from './errors.js';
import { emptyRecord, parseAttempt, type Notes, type StudyRecord } from './review-policy.js';

function asNotes(value: unknown): Notes {
  const source = Array.isArray(value) ? value.slice(0, 3) : [];
  const notes: Notes = ['', '', ''];
  for (let index = 0; index < 3; index += 1) {
    const item = source[index];
    notes[index] = typeof item === 'string' ? item : '';
  }
  return notes;
}

/** Normalize a localStorage study snapshot. Unknown shapes become a fresh record. */
export function normalizeLegacy(value: unknown, questionId: string, today: string): StudyRecord {
  const record = emptyRecord(questionId, today);
  if (!value || typeof value !== 'object') return record;
  const raw = value as Record<string, unknown>;
  if (typeof raw.level === 'string' && isLevel(raw.level)) record.level = raw.level;
  const stage = Number(raw.stage);
  if (Number.isFinite(stage)) {
    record.stage = Math.min(MAX_STAGE, Math.max(0, Math.trunc(stage)));
  }
  const count = Number(raw.count ?? raw.reviewCount);
  if (Number.isFinite(count)) record.reviewCount = Math.max(0, Math.trunc(count));
  if (typeof raw.next === 'string' && isIsoDate(raw.next)) record.nextReviewOn = raw.next;
  if (typeof raw.nextReviewOn === 'string' && isIsoDate(raw.nextReviewOn)) {
    record.nextReviewOn = raw.nextReviewOn;
  }
  record.notes = asNotes(raw.notes);
  record.attempt = parseAttempt(raw.attempt);
  if (typeof raw.essayDraft === 'string') record.essayDraft = raw.essayDraft.slice(0, NOTE_LIMIT);
  else if (typeof raw.essay === 'string') record.essayDraft = raw.essay.slice(0, NOTE_LIMIT);
  const reviewed = raw.lastReviewedOn;
  if (typeof reviewed === 'string' && isIsoDate(reviewed)) record.lastReviewedOn = reviewed;
  return record;
}
