import assert from 'node:assert/strict';
import test from 'node:test';
import { plusDays, shanghaiDate } from './calendar.js';
import { REVIEW_INTERVALS } from './errors.js';
import { isDue, matchesQuestion } from './filter.js';
import { normalizeLegacy } from './normalize.js';
import type { Question } from './question.js';
import { completeReview, emptyRecord, markLevel, replaceNotes } from './review-policy.js';

const today = '2026-10-12';

test('plusDays crosses the sample date and month boundaries without host timezone', () => {
  assert.equal(plusDays('2026-10-09', 1), '2026-10-10');
  assert.equal(plusDays('2026-10-31', 1), '2026-11-01');
  assert.equal(plusDays('2026-12-31', 1), '2027-01-01');
  assert.deepEqual(REVIEW_INTERVALS, [0, 1, 2, 4, 7, 15, 30]);
});

test('shanghaiDate follows UTC+8 across midnight', () => {
  assert.equal(shanghaiDate(new Date('2026-10-09T15:59:00.000Z')), '2026-10-09');
  assert.equal(shanghaiDate(new Date('2026-10-09T16:00:00.000Z')), '2026-10-10');
});

test('complete advances one stage and refuses a second completion the same day', () => {
  const start = emptyRecord('Q1', today);
  const first = completeReview(start, today, '2026-10-12T01:00:00.000Z');
  assert.equal(first.idempotent, false);
  assert.equal(first.record.stage, 1);
  assert.equal(first.record.reviewCount, 1);
  assert.equal(first.record.lastReviewedOn, today);
  assert.equal(first.record.nextReviewOn, '2026-10-13');
  assert.equal(first.record.version, 1);

  const second = completeReview(first.record, today, '2026-10-12T09:00:00.000Z');
  assert.equal(second.idempotent, true);
  assert.equal(second.record.stage, 1);
  assert.equal(second.record.reviewCount, 1);
  assert.equal(second.record.version, 1);

  const nextDay = completeReview(first.record, '2026-10-13', '2026-10-13T01:00:00.000Z');
  assert.equal(nextDay.record.stage, 2);
  assert.equal(nextDay.record.reviewCount, 2);
  assert.equal(nextDay.record.nextReviewOn, plusDays('2026-10-13', 2));
});

test('the last interval stays at 30 days', () => {
  const mature = { ...emptyRecord('Q1', today), stage: 6, reviewCount: 8, version: 3 };
  const done = completeReview(mature, today, '2026-10-12T01:00:00.000Z');
  assert.equal(done.record.stage, 6);
  assert.equal(done.record.reviewCount, 9);
  assert.equal(done.record.nextReviewOn, plusDays(today, 30));
});

test('markLevel does not move the schedule', () => {
  const start = emptyRecord('Q2', today);
  const marked = markLevel(start, 'mastered', '2026-10-12T02:00:00.000Z');
  assert.equal(marked.ok, true);
  if (!marked.ok) return;
  assert.equal(marked.value.level, 'mastered');
  assert.equal(marked.value.stage, 0);
  assert.equal(marked.value.nextReviewOn, today);
  assert.equal(marked.value.version, 1);
  assert.equal(markLevel(start, 'expert', '2026-10-12T02:00:00.000Z').ok, false);
});

test('replaceNotes keeps three fields and bumps version', () => {
  const start = emptyRecord('Q3', today);
  const saved = replaceNotes(start, ['甲', '乙', '丙'], '2026-10-12T02:00:00.000Z');
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.deepEqual(saved.value.notes, ['甲', '乙', '丙']);
  assert.equal(saved.value.version, 1);
  assert.equal(replaceNotes(start, ['only-one'], '2026-10-12T02:00:00.000Z').ok, false);
});

test('legacy localStorage records normalize without borrowing neighbor notes', () => {
  const legacy = normalizeLegacy(
    { level: 'mastered', notes: ['原有笔记', '', ''], count: 4, stage: 2, next: '2026-12-01' },
    'Q1',
    today,
  );
  assert.equal(legacy.notes[0], '原有笔记');
  assert.equal(legacy.reviewCount, 4);
  assert.equal(legacy.stage, 2);
  assert.equal(legacy.nextReviewOn, '2026-12-01');
  const fresh = normalizeLegacy(undefined, 'Q14', today);
  assert.equal(fresh.level, 'new');
  assert.equal(fresh.notes[0], '');
  assert.equal(fresh.nextReviewOn, today);
});

test('keyword and due filters follow the study screen rules', () => {
  const question = {
    id: 'Q1',
    title: '管道',
    topic: '风格',
    kind: '单选题',
    stem: '处理过程',
    blanks: [{ label: '本题', answer: '管道-过滤器', letter: 'B', options: [] }],
    concept: '',
    steps: [],
    core: [],
    example: '',
    pitfalls: [],
    motto: '',
    source: '',
    summary: [],
  } satisfies Question;
  const record = { level: 'vague' as const, nextReviewOn: '2026-10-12' };
  assert.equal(isDue('2026-10-12', today), true);
  assert.equal(isDue('2026-10-13', today), false);
  assert.equal(matchesQuestion(question, record, { filter: 'due', keyword: '', today }), true);
  assert.equal(matchesQuestion(question, record, { filter: 'mastered', keyword: '', today }), false);
  assert.equal(matchesQuestion(question, record, { filter: 'all', keyword: '管道-过滤器', today }), true);
  assert.equal(matchesQuestion(question, record, { filter: 'all', keyword: '不存在', today }), false);
});
