import { plusDays } from './calendar.js';
import {
  type DomainError,
  isLevel,
  type Level,
  MAX_STAGE,
  NOTE_LIMIT,
  REVIEW_INTERVALS,
  type Result,
} from './errors.js';

export type Notes = [string, string, string];

export type StudyRecord = {
  questionId: string;
  level: Level;
  stage: number;
  reviewCount: number;
  lastMarkedAt: string | null;
  lastReviewedOn: string | null;
  nextReviewOn: string;
  notes: Notes;
  version: number;
};

export function emptyRecord(questionId: string, today: string): StudyRecord {
  return {
    questionId,
    level: 'new',
    stage: 0,
    reviewCount: 0,
    lastMarkedAt: null,
    lastReviewedOn: null,
    nextReviewOn: today,
    notes: ['', '', ''],
    version: 0,
  };
}

export function intervalDays(stage: number): number {
  const days = REVIEW_INTERVALS[stage];
  if (days === undefined) {
    throw new Error(`复习阶段超出间隔表: ${stage}`);
  }
  return days;
}

/**
 * Advance one spaced-repetition stage.
 * A second completion on the same Asia/Shanghai calendar day is a no-op.
 * The caller must hold the row lock; this function does not read shared state.
 */
export function completeReview(
  record: StudyRecord,
  today: string,
  nowIso: string,
): { record: StudyRecord; idempotent: boolean } {
  if (record.lastReviewedOn === today) {
    return { record, idempotent: true };
  }
  const stage = Math.min(record.stage + 1, MAX_STAGE);
  return {
    idempotent: false,
    record: {
      ...record,
      stage,
      reviewCount: record.reviewCount + 1,
      lastReviewedOn: today,
      nextReviewOn: plusDays(today, intervalDays(stage)),
      lastMarkedAt: nowIso,
      version: record.version + 1,
    },
  };
}

export function markLevel(record: StudyRecord, level: string, nowIso: string): Result<StudyRecord> {
  if (!isLevel(level)) {
    return { ok: false, error: { code: 'invalid_level', message: '掌握程度无效' } };
  }
  return {
    ok: true,
    value: {
      ...record,
      level,
      lastMarkedAt: nowIso,
      version: record.version + 1,
    },
  };
}

export function replaceNotes(
  record: StudyRecord,
  notes: readonly string[],
  _nowIso: string,
): Result<StudyRecord> {
  if (notes.length !== 3 || notes.some((note) => typeof note !== 'string' || note.length > NOTE_LIMIT)) {
    const error: DomainError = { code: 'invalid_notes', message: '费曼笔记必须是三段文本' };
    return { ok: false, error };
  }
  return {
    ok: true,
    value: {
      ...record,
      notes: [notes[0] ?? '', notes[1] ?? '', notes[2] ?? ''],
      version: record.version + 1,
    },
  };
}
