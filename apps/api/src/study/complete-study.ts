import { and, eq } from 'drizzle-orm';
import { completeReview, parseAttempt, type StudyRecord } from '@atlas/domain';
import type { Database } from '../db/database.js';
import { studyRecord, type StudyRow } from '../db/study-schema.js';
import { isLevel } from '@atlas/domain';

export class StudyConflictError extends Error {
  readonly code = 'version_conflict';
  constructor() {
    super('学习记录已被其他保存更新，请重新加载');
  }
}

export class UnknownQuestionError extends Error {
  readonly code = 'unknown_question';
  constructor(questionId: string) {
    super(`题库中没有 ${questionId}`);
  }
}

/** node-pg returns timestamptz as `YYYY-MM-DD HH:mm:ss+00`, which Safari will not parse. */
function asIso(value: string | null): string | null {
  if (value == null) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} /.test(value)
    ? value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00')
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function toStudyRecord(row: StudyRow): StudyRecord {
  return {
    questionId: row.questionId,
    level: isLevel(row.level) ? row.level : 'new',
    stage: row.stage,
    reviewCount: row.reviewCount,
    lastMarkedAt: asIso(row.lastMarkedAt),
    lastReviewedOn: row.lastReviewedOn,
    nextReviewOn: row.nextReviewOn,
    notes: [row.note0, row.note1, row.note2],
    attempt: parseAttempt(row.attempt),
    essayDraft: row.essayDraft,
    version: row.version,
  };
}

function blankRow(input: { userId: string; bankId: string; questionId: string; today: string }) {
  return {
    userId: input.userId,
    bankId: input.bankId,
    questionId: input.questionId,
    level: 'new' as const,
    stage: 0,
    reviewCount: 0,
    lastMarkedAt: null,
    lastReviewedOn: null,
    nextReviewOn: input.today,
    note0: '',
    note1: '',
    note2: '',
    version: 1,
  };
}

export async function completeStudy(
  db: Database,
  input: {
    userId: string;
    bankId: string;
    questionId: string;
    known: boolean;
    today: string;
    nowIso: string;
  },
): Promise<{ record: StudyRecord; idempotent: boolean }> {
  if (!input.known) throw new UnknownQuestionError(input.questionId);
  return db.transaction(async (tx) => {
    // The insert is a no-op when the row exists, so two transactions cannot both miss it.
    await tx.insert(studyRecord).values(blankRow(input)).onConflictDoNothing({
      target: [studyRecord.userId, studyRecord.bankId, studyRecord.questionId],
    });
    const [locked] = await tx
      .select()
      .from(studyRecord)
      .where(
        and(
          eq(studyRecord.userId, input.userId),
          eq(studyRecord.bankId, input.bankId),
          eq(studyRecord.questionId, input.questionId),
        ),
      )
      .for('update');
    if (!locked) throw new StudyConflictError();
    const outcome = completeReview(toStudyRecord(locked), input.today, input.nowIso);
    if (outcome.idempotent) return outcome;
    const [updated] = await tx
      .update(studyRecord)
      .set({
        stage: outcome.record.stage,
        reviewCount: outcome.record.reviewCount,
        lastMarkedAt: outcome.record.lastMarkedAt,
        lastReviewedOn: outcome.record.lastReviewedOn,
        nextReviewOn: outcome.record.nextReviewOn,
        version: outcome.record.version,
        updatedAt: input.nowIso,
      })
      .where(and(eq(studyRecord.id, locked.id), eq(studyRecord.version, locked.version)))
      .returning();
    if (!updated) throw new StudyConflictError();
    return { record: toStudyRecord(updated), idempotent: false };
  });
}
