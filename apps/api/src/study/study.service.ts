import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  attemptChoices,
  emptyRecord,
  formatAttempt,
  hasNoteText,
  markLevel,
  normalizeLegacy,
  notesChanged,
  replaceEssay,
  replaceNotes,
  shanghaiDate,
  type BlankVerdict,
  type StudyRecord,
} from '@atlas/domain';
import { and, asc, eq, lte, sql } from 'drizzle-orm';
import { bankQuestionIds, bankQuestions } from '../banks/catalog.js';
import { DATABASE, type Database } from '../db/db.module.js';
import { attemptLog, noteHistory, studyRecord, type AttemptLogRow, type NoteHistoryRow } from '../db/study-schema.js';
import { asIso, completeStudy, StudyConflictError, toStudyRecord, UnknownQuestionError } from './complete-study.js';

type StudyFollowUp = {
  notes?: [string, string, string];
  attempts?: { blankIndex: number; choice: string | null; verdict: string }[];
  createdAt?: string;
};

function toAttemptEntry(row: AttemptLogRow) {
  const at = asIso(row.createdAt);
  if (!at) return null;
  if (row.verdict !== 'right' && row.verdict !== 'wrong' && row.verdict !== 'skip' && row.verdict !== 'open') return null;
  return {
    questionId: row.questionId,
    blankIndex: row.blankIndex,
    choice: row.choice,
    verdict: row.verdict,
    at,
  };
}

function toNoteEntry(row: NoteHistoryRow) {
  const at = asIso(row.createdAt);
  if (!at) return null;
  return { questionId: row.questionId, notes: [row.note0, row.note1, row.note2] as [string, string, string], at };
}

function isPgError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string';
}

@Injectable()
export class StudyService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private questions(bankId: string) {
    const questions = bankQuestions(bankId);
    if (!questions) throw new NotFoundException('题库不存在');
    return questions;
  }

  private assertQuestion(bankId: string, questionId: string): void {
    const ids = bankQuestionIds(bankId);
    if (!ids) throw new NotFoundException('题库不存在');
    if (!ids.has(questionId)) throw new NotFoundException(`题库中没有 ${questionId}`);
  }

  async list(userId: string, bankId: string) {
    const questions = this.questions(bankId);
    const today = shanghaiDate();
    const rows = await this.db
      .select()
      .from(studyRecord)
      .where(and(eq(studyRecord.userId, userId), eq(studyRecord.bankId, bankId)));
    const byId = new Map(rows.map((row) => [row.questionId, toStudyRecord(row)]));
    const records = questions.map((question) => byId.get(question.id) ?? emptyRecord(question.id, today));
    const owned = and(eq(attemptLog.userId, userId), eq(attemptLog.bankId, bankId));
    const logRows = await this.db
      .select()
      .from(attemptLog)
      .where(owned)
      .orderBy(asc(attemptLog.createdAt), asc(attemptLog.blankIndex));
    const noteRows = await this.db
      .select()
      .from(noteHistory)
      .where(and(eq(noteHistory.userId, userId), eq(noteHistory.bankId, bankId)))
      .orderBy(asc(noteHistory.createdAt));
    return {
      today,
      bankId,
      records,
      dueQuestionIds: await this.dueIds(userId, bankId, today, byId),
      attemptLog: logRows.flatMap((row) => {
        const entry = toAttemptEntry(row);
        return entry ? [entry] : [];
      }),
      noteHistory: noteRows.flatMap((row) => {
        const entry = toNoteEntry(row);
        return entry ? [entry] : [];
      }),
    };
  }

  async due(userId: string, bankId: string) {
    this.questions(bankId);
    const today = shanghaiDate();
    const rows = await this.db
      .select({ questionId: studyRecord.questionId })
      .from(studyRecord)
      .where(and(eq(studyRecord.userId, userId), eq(studyRecord.bankId, bankId)));
    const byId = new Map(rows.map((row) => [row.questionId, row.questionId]));
    return { today, bankId, questionIds: await this.dueIds(userId, bankId, today, byId) };
  }

  /**
   * Persisted due rows use the (user, bank, next_review_on) index.
   * A question with no row is due today, matching the old empty record.
   */
  private async dueIds(
    userId: string,
    bankId: string,
    today: string,
    knownIds: Map<string, unknown>,
  ): Promise<string[]> {
    const persisted = await this.db
      .select({ questionId: studyRecord.questionId })
      .from(studyRecord)
      .where(
        and(
          eq(studyRecord.userId, userId),
          eq(studyRecord.bankId, bankId),
          lte(studyRecord.nextReviewOn, today),
        ),
      );
    const questions = this.questions(bankId);
    const due = new Set(persisted.map((row) => row.questionId));
    for (const question of questions) {
      if (!knownIds.has(question.id)) due.add(question.id);
    }
    return questions.filter((question) => due.has(question.id)).map((question) => question.id);
  }

  async saveNotes(userId: string, bankId: string, questionId: string, version: number, notes: [string, string, string]) {
    this.assertQuestion(bankId, questionId);
    const today = shanghaiDate();
    const [existing] = await this.db
      .select({ note0: studyRecord.note0, note1: studyRecord.note1, note2: studyRecord.note2 })
      .from(studyRecord)
      .where(and(eq(studyRecord.userId, userId), eq(studyRecord.bankId, bankId), eq(studyRecord.questionId, questionId)));
    const previous: [string, string, string] = existing ? [existing.note0, existing.note1, existing.note2] : ['', '', ''];
    const checked = replaceNotes(emptyRecord(questionId, today), notes, new Date().toISOString());
    if (!checked.ok) throw new BadRequestException({ code: checked.error.code, detail: checked.error.message });
    const next = checked.value.notes;
    const keep = notesChanged(previous, next) && hasNoteText(next);
    return this.writeFields(
      userId,
      bankId,
      questionId,
      version,
      today,
      {
        note0: next[0],
        note1: next[1],
        note2: next[2],
        version: version + 1,
      },
      keep ? { notes: next, createdAt: new Date().toISOString() } : undefined,
    );
  }

  async saveEssay(userId: string, bankId: string, questionId: string, version: number, essayDraft: string) {
    this.assertQuestion(bankId, questionId);
    const today = shanghaiDate();
    const checked = replaceEssay(emptyRecord(questionId, today), essayDraft);
    if (!checked.ok) throw new BadRequestException({ code: checked.error.code, detail: checked.error.message });
    return this.writeFields(userId, bankId, questionId, version, today, {
      essayDraft: checked.value.essayDraft,
      version: version + 1,
    });
  }

  async saveAttempts(
    userId: string,
    bankId: string,
    items: { questionId: string; version: number; attempt: BlankVerdict[]; choices: (string | null)[] }[],
  ) {
    this.questions(bankId);
    const today = shanghaiDate();
    const records: StudyRecord[] = [];
    const written: { questionId: string; blankIndex: number; choice: string | null; verdict: BlankVerdict; at: string }[] = [];
    for (const item of items) {
      this.assertQuestion(bankId, item.questionId);
      const paired = attemptChoices(item.attempt, item.choices);
      if (!paired.ok) throw new BadRequestException({ code: paired.error.code, detail: paired.error.message });
      const question = this.questions(bankId).find((entry) => entry.id === item.questionId);
      if (!question || question.blanks.length !== paired.value.attempt.length) {
        throw new BadRequestException({ code: 'invalid_attempt', detail: '交卷结果无效' });
      }
      const createdAt = new Date().toISOString();
      records.push(
        await this.writeFields(
          userId,
          bankId,
          item.questionId,
          item.version,
          today,
          {
            attempt: formatAttempt(paired.value.attempt),
            version: item.version + 1,
          },
          {
            createdAt,
            attempts: paired.value.attempt.map((verdict, index) => ({
              blankIndex: index,
              choice: paired.value.choices[index] ?? null,
              verdict,
            })),
          },
        ),
      );
      paired.value.attempt.forEach((verdict, index) => {
        written.push({
          questionId: item.questionId,
          blankIndex: index,
          choice: paired.value.choices[index] ?? null,
          verdict,
          at: createdAt,
        });
      });
    }
    return { records, attemptLog: written };
  }

  async saveLevel(userId: string, bankId: string, questionId: string, version: number, level: string) {
    this.assertQuestion(bankId, questionId);
    const today = shanghaiDate();
    const nowIso = new Date().toISOString();
    const checked = markLevel(emptyRecord(questionId, today), level, nowIso);
    if (!checked.ok) throw new BadRequestException({ code: checked.error.code, detail: checked.error.message });
    return this.writeFields(userId, bankId, questionId, version, today, {
      level: checked.value.level,
      lastMarkedAt: checked.value.lastMarkedAt,
      version: version + 1,
    });
  }

  async complete(userId: string, bankId: string, questionId: string) {
    const known = bankQuestionIds(bankId)?.has(questionId) ?? false;
    if (!bankQuestions(bankId)) throw new NotFoundException('题库不存在');
    const now = new Date();
    try {
      return await completeStudy(this.db, {
        userId,
        bankId,
        questionId,
        known,
        today: shanghaiDate(now),
        nowIso: now.toISOString(),
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  async importSnapshot(userId: string, bankId: string, records: Record<string, unknown>) {
    const ids = bankQuestionIds(bankId);
    if (!ids) throw new NotFoundException('题库不存在');
    const today = shanghaiDate();
    const nowIso = new Date().toISOString();
    let imported = 0;
    let ignored = 0;
    await this.db.transaction(async (tx) => {
      for (const [questionId, raw] of Object.entries(records)) {
        if (!ids.has(questionId)) {
          ignored += 1;
          continue;
        }
        const normalized = normalizeLegacy(raw, questionId, today);
        await tx
          .insert(studyRecord)
          .values({
            userId,
            bankId,
            questionId,
            level: normalized.level,
            stage: normalized.stage,
            reviewCount: normalized.reviewCount,
            lastMarkedAt: null,
            lastReviewedOn: normalized.lastReviewedOn,
            nextReviewOn: normalized.nextReviewOn,
            note0: normalized.notes[0],
            note1: normalized.notes[1],
            note2: normalized.notes[2],
            attempt: normalized.attempt ? formatAttempt(normalized.attempt) : null,
            essayDraft: normalized.essayDraft,
            version: 1,
            updatedAt: nowIso,
          })
          .onConflictDoUpdate({
            target: [studyRecord.userId, studyRecord.bankId, studyRecord.questionId],
            set: {
              level: normalized.level,
              stage: normalized.stage,
              reviewCount: normalized.reviewCount,
              lastReviewedOn: normalized.lastReviewedOn,
              nextReviewOn: normalized.nextReviewOn,
              note0: normalized.notes[0],
              note1: normalized.notes[1],
              note2: normalized.notes[2],
              attempt: normalized.attempt ? formatAttempt(normalized.attempt) : null,
              essayDraft: normalized.essayDraft,
              version: sql`${studyRecord.version} + 1`,
              updatedAt: nowIso,
            },
          });
        imported += 1;
      }
    });
    return { imported, ignored };
  }

  private async writeFields(
    userId: string,
    bankId: string,
    questionId: string,
    version: number,
    today: string,
    patch: Partial<typeof studyRecord.$inferInsert> & { version: number },
    follow?: StudyFollowUp,
  ): Promise<StudyRecord> {
    try {
      return await this.db.transaction(async (tx) => {
        const append = async () => {
          if (!follow) return;
          const createdAt = follow.createdAt ?? new Date().toISOString();
          if (follow.attempts && follow.attempts.length > 0) {
            await tx.insert(attemptLog).values(
              follow.attempts.map((row) => ({
                userId,
                bankId,
                questionId,
                blankIndex: row.blankIndex,
                choice: row.choice,
                verdict: row.verdict,
                createdAt,
              })),
            );
          }
          if (follow.notes) {
            await tx.insert(noteHistory).values({
              userId,
              bankId,
              questionId,
              note0: follow.notes[0],
              note1: follow.notes[1],
              note2: follow.notes[2],
              createdAt,
            });
          }
        };
        if (version === 0) {
          const [inserted] = await tx
            .insert(studyRecord)
            .values({
              userId,
              bankId,
              questionId,
              level: 'new',
              stage: 0,
              reviewCount: 0,
              lastMarkedAt: null,
              lastReviewedOn: null,
              nextReviewOn: today,
              note0: '',
              note1: '',
              note2: '',
              ...patch,
              updatedAt: new Date().toISOString(),
            })
            .onConflictDoNothing({
              target: [studyRecord.userId, studyRecord.bankId, studyRecord.questionId],
            })
            .returning();
          if (inserted) {
            await append();
            return toStudyRecord(inserted);
          }
        }
        const [updated] = await tx
          .update(studyRecord)
          .set({ ...patch, updatedAt: new Date().toISOString() })
          .where(
            and(
              eq(studyRecord.userId, userId),
              eq(studyRecord.bankId, bankId),
              eq(studyRecord.questionId, questionId),
              eq(studyRecord.version, version),
            ),
          )
          .returning();
        if (!updated) throw new StudyConflictError();
        await append();
        return toStudyRecord(updated);
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (error instanceof StudyConflictError) {
      throw new ConflictException({ code: error.code, detail: error.message });
    }
    if (error instanceof UnknownQuestionError) throw new NotFoundException(error.message);
    if (isPgError(error) && (error.code === '55P03' || error.code === '57014')) {
      throw new HttpException({ code: 'database_busy', detail: '数据库忙，请重试' }, 503);
    }
    throw error;
  }
}
