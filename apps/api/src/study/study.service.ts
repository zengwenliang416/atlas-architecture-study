import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  emptyRecord,
  formatAttempt,
  markLevel,
  normalizeLegacy,
  replaceAttempt,
  replaceEssay,
  replaceNotes,
  shanghaiDate,
  type BlankVerdict,
  type StudyRecord,
} from '@atlas/domain';
import { and, eq, lte, sql } from 'drizzle-orm';
import { bankQuestionIds, bankQuestions } from '../banks/catalog.js';
import { DATABASE, type Database } from '../db/db.module.js';
import { studyRecord } from '../db/study-schema.js';
import { completeStudy, StudyConflictError, toStudyRecord, UnknownQuestionError } from './complete-study.js';

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
    return { today, bankId, records, dueQuestionIds: await this.dueIds(userId, bankId, today, byId) };
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
    const checked = replaceNotes(emptyRecord(questionId, today), notes, new Date().toISOString());
    if (!checked.ok) throw new BadRequestException({ code: checked.error.code, detail: checked.error.message });
    return this.writeFields(userId, bankId, questionId, version, today, {
      note0: checked.value.notes[0],
      note1: checked.value.notes[1],
      note2: checked.value.notes[2],
      version: version + 1,
    });
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
    items: { questionId: string; version: number; attempt: BlankVerdict[] }[],
  ) {
    this.questions(bankId);
    const today = shanghaiDate();
    const records: StudyRecord[] = [];
    for (const item of items) {
      this.assertQuestion(bankId, item.questionId);
      const checked = replaceAttempt(emptyRecord(item.questionId, today), item.attempt);
      if (!checked.ok || !checked.value.attempt) {
        throw new BadRequestException({ code: 'invalid_attempt', detail: '交卷结果无效' });
      }
      records.push(
        await this.writeFields(userId, bankId, item.questionId, item.version, today, {
          attempt: formatAttempt(checked.value.attempt),
          version: item.version + 1,
        }),
      );
    }
    return { records };
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
  ): Promise<StudyRecord> {
    try {
      return await this.db.transaction(async (tx) => {
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
          if (inserted) return toStudyRecord(inserted);
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
