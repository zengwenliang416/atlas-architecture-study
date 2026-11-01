import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attemptOf,
  blankStatusText,
  canRevealBlank,
  compareLine,
  compareRows,
  gradeBlank,
  hasWrongBlank,
  monthLoad,
  parseAttempt,
  tallyText,
} from './index.js';

const choice = (id) => ({ id, name: id, meaning: '', reason: '', correct: id === 'B' });
const question = {
  id: 'Q1',
  title: '管道',
  blanks: [
    { label: '本题', answer: '管道-过滤器风格', letter: 'B', options: [choice('A'), choice('B')] },
    { label: '概念', answer: '流水线', letter: '', options: [] },
  ],
};

test('blank status stays masked until the blank is open', () => {
  assert.equal(canRevealBlank(4, undefined, false), false);
  assert.equal(canRevealBlank(4, 'A', false), true);
  assert.equal(canRevealBlank(0, undefined, false), true);
  assert.equal(blankStatusText({ optionCount: 4, letter: 'B', open: false }), '先选择一个选项，再揭晓');
  assert.equal(blankStatusText({ optionCount: 4, selected: 'A', letter: 'B', open: false }), '你选择了 A，答案仍遮着');
  assert.equal(blankStatusText({ optionCount: 4, selected: 'B', letter: 'B', open: true }), '回答正确');
  assert.equal(blankStatusText({ optionCount: 4, selected: 'A', letter: 'B', open: true }), '你选择了 A，本空应选 B');
  assert.equal(blankStatusText({ optionCount: 0, letter: '', open: true }), '');
});

test('交卷 grades selections and leaves concept blanks open', () => {
  assert.equal(gradeBlank(question.blanks[0], 'B'), 'right');
  assert.equal(gradeBlank(question.blanks[0], 'A'), 'wrong');
  assert.equal(gradeBlank(question.blanks[0], undefined), 'skip');
  assert.equal(gradeBlank(question.blanks[1], undefined), 'open');
  const rows = compareRows([question], { Q1_0: 'A' });
  const gap = '\u3000';
  assert.equal(compareLine(rows[0]), `Q1 本题${gap}选择 A${gap}正确 B · 管道-过滤器风格${gap}错`);
  assert.equal(compareLine(rows[1]), `Q1 概念${gap}选择 未选${gap}正确 流水线${gap}概念填空`);
  assert.deepEqual(attemptOf(question, { Q1_0: 'A' }), ['wrong', 'open']);
  assert.equal(hasWrongBlank(['wrong', 'open']), true);
  assert.equal(hasWrongBlank(['open']), false);
  assert.equal(hasWrongBlank(['right']), false);
  assert.equal(hasWrongBlank(null), false);
  assert.equal(tallyText({ right: 0, wrong: 1, skip: 0, open: 1 }), '对 0 · 错 1 · 未答 0 · 概念填空 1');
});

test('parseAttempt accepts the stored array and the text column', () => {
  assert.deepEqual(parseAttempt(['right', 'skip']), ['right', 'skip']);
  assert.deepEqual(parseAttempt('right,open'), ['right', 'open']);
  assert.equal(parseAttempt(''), null);
  assert.equal(parseAttempt('right,maybe'), null);
  assert.equal(parseAttempt(null), null);
});

test('month load uses the civil date and piles overdue work onto today', () => {
  const load = monthLoad('2026-11-01', ['2026-10-09', '2026-11-01', '2026-11-15', '2026-12-01', 'bad']);
  assert.equal(load.title, '2026年11月');
  assert.deepEqual(load.weekdays, ['一', '二', '三', '四', '五', '六', '日']);
  assert.equal(load.cells[0].date, '2026-10-26');
  assert.equal(load.cells[0].inMonth, false);
  const today = load.cells.find((cell) => cell.isToday);
  const later = load.cells.find((cell) => cell.date === '2026-11-15');
  const nextMonth = load.cells.find((cell) => cell.date === '2026-12-01');
  assert.equal(today?.count, 2);
  assert.equal(later?.count, 1);
  assert.equal(nextMonth?.inMonth, false);
  assert.equal(nextMonth?.count, 0);
  assert.equal(load.cells.filter((cell) => cell.inMonth).length, 30);
});
