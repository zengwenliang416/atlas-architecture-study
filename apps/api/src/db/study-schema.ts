import { date, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const studyRecord = pgTable(
  'study_record',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    bankId: text('bank_id').notNull(),
    questionId: text('question_id').notNull(),
    level: text('level').notNull(),
    stage: integer('stage').notNull(),
    reviewCount: integer('review_count').notNull(),
    lastMarkedAt: timestamp('last_marked_at', { withTimezone: true, mode: 'string' }),
    lastReviewedOn: date('last_reviewed_on'),
    nextReviewOn: date('next_review_on').notNull(),
    note0: text('note_0').notNull().default(''),
    note1: text('note_1').notNull().default(''),
    note2: text('note_2').notNull().default(''),
    attempt: text('attempt'),
    essayDraft: text('essay_draft').notNull().default(''),
    version: integer('version').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [
    unique('study_record_identity').on(table.userId, table.bankId, table.questionId),
    index('study_record_due').on(table.userId, table.bankId, table.nextReviewOn),
  ],
);

export type StudyRow = typeof studyRecord.$inferSelect;

/** Append-only hand-in rows. Callers insert; they do not update. */
export const attemptLog = pgTable(
  'attempt_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    bankId: text('bank_id').notNull(),
    questionId: text('question_id').notNull(),
    blankIndex: integer('blank_index').notNull(),
    choice: text('choice'),
    verdict: text('verdict').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [index('attempt_log_question').on(table.userId, table.bankId, table.questionId)],
);

/** Append-only Feynman snapshots. A save with unchanged or empty text does not insert. */
export const noteHistory = pgTable(
  'note_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    bankId: text('bank_id').notNull(),
    questionId: text('question_id').notNull(),
    note0: text('note_0').notNull().default(''),
    note1: text('note_1').notNull().default(''),
    note2: text('note_2').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => [index('note_history_question').on(table.userId, table.bankId, table.questionId, table.createdAt)],
);

export type AttemptLogRow = typeof attemptLog.$inferSelect;
export type NoteHistoryRow = typeof noteHistory.$inferSelect;
