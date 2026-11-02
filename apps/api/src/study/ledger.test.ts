import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { DATA } from '@atlas/bank-architecture';
import { BadRequestException } from '@nestjs/common';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { user } from '../db/auth-schema.js';
import { createDatabase } from '../db/database.js';
import { completeStudy } from './complete-study.js';
import { StudyService } from './study.service.js';

const databaseUrl = process.env.DATABASE_URL;
const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

async function migrationsUntil(tag: string): Promise<string> {
  const journal = JSON.parse(await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8')) as {
    entries: { tag: string }[];
  };
  const cut = journal.entries.findIndex((entry) => entry.tag === tag);
  const folder = await mkdtemp(join(tmpdir(), 'atlas-mig-'));
  await mkdir(join(folder, 'meta'));
  const entries = journal.entries.slice(0, cut + 1);
  await writeFile(join(folder, 'meta/_journal.json'), JSON.stringify({ ...journal, entries }));
  for (const entry of entries) {
    await copyFile(join(migrationsFolder, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`));
  }
  return folder;
}

async function withDatabase(name: string, run: (url: string) => Promise<void>): Promise<void> {
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const admin = new Pool({ connectionString: databaseUrl });
  await admin.query(`create database ${name}`);
  const url = new URL(databaseUrl);
  url.pathname = `/${name}`;
  try {
    await run(url.toString());
  } finally {
    await admin.query(`drop database if exists ${name} with (force)`);
    await admin.end();
  }
}

test('attempt log and note history migrate onto existing study rows', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL is not set');
    return;
  }
  const probe = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    await probe.query('select 1');
  } catch {
    await probe.end();
    t.skip('PostgreSQL is not available');
    return;
  }
  await probe.end();

  const fresh = `atlas_mig_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  await withDatabase(fresh, async (url) => {
    const pool = new Pool({ connectionString: url });
    try {
      await migrate(createDatabase(pool), { migrationsFolder });
      const tables = await pool.query<{ table_name: string }>(
        `select table_name from information_schema.tables
         where table_schema = 'public' and table_name in ('study_record', 'attempt_log', 'note_history')
         order by table_name`,
      );
      assert.deepEqual(tables.rows.map((row) => row.table_name), ['attempt_log', 'note_history', 'study_record']);
    } finally {
      await pool.end();
    }
  });

  const staged = `atlas_mig_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const priorId = randomUUID();
  const userId = randomUUID();
  await withDatabase(staged, async (url) => {
    const pool = new Pool({ connectionString: url });
    try {
      const partial = await migrationsUntil('0001_attempt_essay');
      await migrate(createDatabase(pool), { migrationsFolder: partial });
      await pool.query(
        `insert into "user" (id, name, email, email_verified, created_at, updated_at)
         values ($1, 'prior', $2, true, now(), now())`,
        [priorId, `${priorId}@example.com`],
      );
      await pool.query(
        `insert into study_record (
           user_id, bank_id, question_id, level, stage, review_count,
           last_reviewed_on, next_review_on, note_0, note_1, note_2, attempt, essay_draft, version, updated_at
         ) values ($1, 'architecture', 'Q1', 'vague', 3, 4, '2026-10-01', '2026-12-01', '旧笔记', '', '', 'wrong', '草稿', 2, now())`,
        [priorId],
      );
      await migrate(createDatabase(pool), { migrationsFolder });
      const kept = await pool.query<{
        level: string;
        stage: number;
        review_count: number;
        next_review_on: string;
        note_0: string;
        attempt: string;
        essay_draft: string;
        version: number;
      }>(
        `select level, stage, review_count, next_review_on::text, note_0, attempt, essay_draft, version
         from study_record where user_id = $1`,
        [priorId],
      );
      assert.equal(kept.rows[0]?.level, 'vague');
      assert.equal(kept.rows[0]?.stage, 3);
      assert.equal(kept.rows[0]?.review_count, 4);
      assert.equal(kept.rows[0]?.next_review_on, '2026-12-01');
      assert.equal(kept.rows[0]?.note_0, '旧笔记');
      assert.equal(kept.rows[0]?.attempt, 'wrong');
      assert.equal(kept.rows[0]?.essay_draft, '草稿');
      assert.equal(kept.rows[0]?.version, 2);
      const emptyLogs = await pool.query<{ logs: number; notes: number }>(
        `select (select count(*)::int from attempt_log) as logs, (select count(*)::int from note_history) as notes`,
      );
      assert.equal(emptyLogs.rows[0]?.logs, 0);
      assert.equal(emptyLogs.rows[0]?.notes, 0);

      const db = createDatabase(pool);
      await db.insert(user).values({
        id: userId,
        name: 'ledger',
        email: `${userId}@example.com`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const service = new StudyService(db);
      const question = DATA.find((item) => item.id === 'Q1');
      assert.ok(question);
      assert.equal(question.blanks.length, 1);
      const firstNote = await service.saveNotes(userId, 'architecture', 'Q1', 0, ['管道把步骤串起来', '', '']);
      const schedule = {
        stage: firstNote.stage,
        reviewCount: firstNote.reviewCount,
        nextReviewOn: firstNote.nextReviewOn,
      };
      assert.equal(schedule.stage, 0);
      assert.equal(schedule.reviewCount, 0);
      const sameNote = await service.saveNotes(userId, 'architecture', 'Q1', firstNote.version, ['管道把步骤串起来', '', '']);
      const handed = await service.saveAttempts(userId, 'architecture', [
        { questionId: 'Q1', version: sameNote.version, attempt: ['wrong'], choices: ['A'] },
      ]);
      assert.deepEqual(handed.records[0]?.attempt, ['wrong']);
      assert.equal(handed.records[0]?.stage, schedule.stage);
      assert.equal(handed.records[0]?.reviewCount, schedule.reviewCount);
      assert.equal(handed.records[0]?.nextReviewOn, schedule.nextReviewOn);
      assert.equal(handed.attemptLog[0]?.choice, 'A');
      assert.equal(handed.attemptLog[0]?.verdict, 'wrong');
      const repeated = await service.saveAttempts(userId, 'architecture', [
        { questionId: 'Q1', version: handed.records[0]?.version ?? 0, attempt: ['wrong'], choices: ['A'] },
      ]);
      assert.equal(repeated.records[0]?.nextReviewOn, schedule.nextReviewOn);
      assert.equal(repeated.records[0]?.stage, schedule.stage);
      const cleared = await service.saveNotes(userId, 'architecture', 'Q1', repeated.records[0]?.version ?? 0, ['', '', '']);
      assert.deepEqual(cleared.notes, ['', '', '']);
      assert.equal(cleared.nextReviewOn, schedule.nextReviewOn);
      const listed = await service.list(userId, 'architecture');
      assert.equal(listed.attemptLog.filter((entry) => entry.questionId === 'Q1' && entry.verdict === 'wrong').length, 2);
      assert.equal(listed.noteHistory.filter((entry) => entry.questionId === 'Q1').length, 1);
      assert.equal(listed.noteHistory[0]?.notes[0], '管道把步骤串起来');
      await assert.rejects(
        () => service.saveAttempts(userId, 'architecture', [
          { questionId: 'Q1', version: cleared.version, attempt: ['wrong'], choices: [null] },
        ]),
        (error: unknown) => error instanceof BadRequestException,
      );
      const beforeComplete = await pool.query<{ n: number }>(
        'select count(*)::int as n from attempt_log where user_id = $1',
        [userId],
      );
      const done = await completeStudy(db, {
        userId,
        bankId: 'architecture',
        questionId: 'Q1',
        known: true,
        today: schedule.nextReviewOn,
        nowIso: `${schedule.nextReviewOn}T01:00:00.000Z`,
      });
      assert.equal(done.idempotent, false);
      assert.equal(done.record.stage, 1);
      assert.notEqual(done.record.nextReviewOn, schedule.nextReviewOn);
      const afterComplete = await pool.query<{ n: number }>(
        'select count(*)::int as n from attempt_log where user_id = $1',
        [userId],
      );
      assert.equal(afterComplete.rows[0]?.n, beforeComplete.rows[0]?.n);
      const still = await pool.query<{ next_review_on: string; note_0: string }>(
        `select next_review_on::text, note_0 from study_record where user_id = $1`,
        [priorId],
      );
      assert.equal(still.rows[0]?.next_review_on, '2026-12-01');
      assert.equal(still.rows[0]?.note_0, '旧笔记');
    } finally {
      await pool.end();
    }
  });
});
