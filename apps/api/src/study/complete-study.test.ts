import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { plusDays } from '@atlas/domain';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { user } from '../db/auth-schema.js';
import { createDatabase } from '../db/database.js';
import { studyRecord } from '../db/study-schema.js';
import { completeStudy } from './complete-study.js';

const databaseUrl = process.env.DATABASE_URL;

test('concurrent complete increments the stage once', async (t) => {
  if (!databaseUrl) {
    t.skip('DATABASE_URL is not set');
    return;
  }
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  try {
    await pool.query('select 1');
  } catch {
    await pool.end();
    t.skip('PostgreSQL is not available');
    return;
  }
  const db = createDatabase(pool);
  const userId = randomUUID();
  const today = '2026-10-12';
  try {
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)),
    });
    await db.insert(user).values({
      id: userId,
      name: 'concurrency',
      email: `${userId}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const calls = Array.from({ length: 8 }, () =>
      completeStudy(db, {
        userId,
        bankId: 'architecture',
        questionId: 'Q1',
        known: true,
        today,
        nowIso: '2026-10-12T01:00:00.000Z',
      }),
    );
    const results = await Promise.all(calls);
    const advanced = results.filter((result) => !result.idempotent);
    assert.equal(advanced.length, 1);
    assert.equal(advanced[0]?.record.stage, 1);
    assert.equal(advanced[0]?.record.reviewCount, 1);

    const again = await completeStudy(db, {
      userId,
      bankId: 'architecture',
      questionId: 'Q1',
      known: true,
      today,
      nowIso: '2026-10-12T02:00:00.000Z',
    });
    assert.equal(again.idempotent, true);
    assert.equal(again.record.stage, 1);

    const nextDay = '2026-10-13';
    const moved = await completeStudy(db, {
      userId,
      bankId: 'architecture',
      questionId: 'Q1',
      known: true,
      today: nextDay,
      nowIso: '2026-10-13T01:00:00.000Z',
    });
    assert.equal(moved.idempotent, false);
    assert.equal(moved.record.stage, 2);
    assert.equal(moved.record.reviewCount, 2);
    assert.equal(moved.record.nextReviewOn, plusDays(nextDay, 2));

    const [row] = await db.select().from(studyRecord).where(eq(studyRecord.userId, userId));
    assert.equal(row?.stage, 2);
  } finally {
    await pool.query('delete from "user" where id = $1', [userId]).catch(() => undefined);
    await pool.end();
  }
});
