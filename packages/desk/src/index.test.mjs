import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attemptEntries,
  attemptOf,
  blankStatusText,
  canRevealBlank,
  compareLine,
  compareRows,
  confrontation,
  confrontationLine,
  drillIds,
  gradeBlank,
  hasNoteText,
  hasPickedWrong,
  hasWrongBlank,
  isMultiAnswer,
  ledgerLine,
  choiceLabel,
  correctLabel,
  mergeMemorized,
  monthLoad,
  notesChanged,
  paperMark,
  paperQuestions,
  parseMemorized,
  wrongOptionNotes,
  parseAttempt,
  parseAttemptEntry,
  parseNoteEntry,
  shanghaiDay,
  siblingIds,
  tallyText,
  wrongLedger,
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

test('多选整组一致才算对，少选和错选都记错', () => {
  const multi = {
    label: '本题',
    answer: '甲、丙',
    letter: 'A、C',
    options: ['A', 'B', 'C', 'D'].map((id) => ({ id, correct: id === 'A' || id === 'C' })),
  };
  assert.equal(isMultiAnswer('A、C'), true);
  assert.equal(isMultiAnswer('B'), false);
  assert.equal(gradeBlank(multi, 'A、C'), 'right');
  assert.equal(gradeBlank(multi, 'C、A'), 'right');
  assert.equal(gradeBlank(multi, 'A'), 'wrong');
  assert.equal(gradeBlank(multi, 'A、B、C'), 'wrong');
  assert.equal(gradeBlank(multi, 'A、B'), 'wrong');
  assert.equal(gradeBlank(multi, undefined), 'skip');
  assert.equal(blankStatusText({ optionCount: 4, selected: 'A、B', letter: 'A、C', open: true }), '你选择了 A、B，本空应选 A、C');
  assert.equal(blankStatusText({ optionCount: 4, selected: 'A、C', letter: 'A、C', open: true }), '回答正确');
  assert.equal(blankStatusText({ optionCount: 4, letter: 'A、C', open: false }), '先选择选项，再揭晓');
});

test('批卷把你选和正解拆开，没有理由就不编', () => {
  const rich = {
    id: 'Q1',
    title: '管道',
    blanks: [{
      label: '本题',
      answer: '管道-过滤器风格',
      letter: 'B',
      options: [
        { id: 'A', name: 'MVC风格', meaning: '一种分层', reason: '不是流水线', correct: false },
        { id: 'B', name: '管道-过滤器风格', meaning: '步骤串联', reason: '数据沿管道流动', correct: true },
      ],
    }],
  };
  const wrong = paperQuestions([rich], { Q1_0: 'A' })[0].blanks[0];
  assert.equal(wrong.yours, 'A · MVC风格');
  assert.equal(wrong.answer, 'B · 管道-过滤器风格');
  assert.equal(wrong.notes[0].reason, '不是流水线');
  assert.equal(paperMark([wrong]), 'wrong');
  const skipped = paperQuestions([rich], {})[0].blanks[0];
  assert.equal(skipped.verdict, 'skip');
  assert.equal(skipped.yours, '未选');
  assert.equal(paperMark([skipped]), 'skip');
  const multi = {
    id: 'H137',
    title: '教学',
    blanks: [{
      label: '本题',
      answer: '乙、丙',
      letter: 'B、C',
      options: [
        { id: 'A', name: '甲', meaning: '', reason: '', correct: false },
        { id: 'B', name: '乙', meaning: '', reason: '', correct: true },
        { id: 'C', name: '丙', meaning: '', reason: '', correct: true },
      ],
    }],
  };
  const picked = paperQuestions([multi], { H137_0: 'A' })[0].blanks[0];
  assert.equal(picked.yours, 'A · 甲');
  assert.equal(picked.answer, 'B · 乙；C · 丙');
  assert.deepEqual(picked.notes, []);
  assert.deepEqual(wrongOptionNotes(multi.blanks[0], 'A'), []);
  const judged = paperQuestions([{
    id: 'H215',
    title: '判断',
    blanks: [{
      label: '本题',
      answer: '错',
      letter: 'B',
      options: [
        { id: 'A', name: '对', meaning: '', reason: '', correct: false },
        { id: 'B', name: '错', meaning: '', reason: '', correct: true },
      ],
    }],
  }], { H215_0: 'A' })[0].blanks[0];
  assert.equal(judged.yours, 'A · 对');
  assert.equal(judged.answer, 'B · 错');
  const open = paperQuestions([{
    id: 'Q9',
    title: 'DSSA',
    blanks: [{ label: '概念', answer: '参考架构', letter: '', options: [] }],
  }], {})[0].blanks[0];
  assert.equal(open.verdict, 'open');
  assert.equal(open.yours, '');
  assert.equal(open.answer, '参考架构');
  assert.equal(correctLabel({ label: '概念', answer: '参考架构', letter: '', options: [] }), '参考架构');
  assert.equal(choiceLabel(undefined, ''), '未选');
  const stored = mergeMemorized('{}', 'architecture', ['Q1']);
  assert.deepEqual(parseMemorized(stored, 'architecture'), ['Q1']);
  assert.deepEqual(parseMemorized(mergeMemorized(stored, 'hcip', ['H1']), 'architecture'), ['Q1']);
  assert.deepEqual(parseMemorized('nope', 'architecture'), []);
});

test('parseAttempt accepts the stored array and the text column', () => {
  assert.deepEqual(parseAttempt(['right', 'skip']), ['right', 'skip']);
  assert.deepEqual(parseAttempt('right,open'), ['right', 'open']);
  assert.equal(parseAttempt(''), null);
  assert.equal(parseAttempt('right,maybe'), null);
  assert.equal(parseAttempt(null), null);
});

test('wrong-option ledger counts repeated letters and keeps the bank text', () => {
  const at = '2026-11-01T01:00:00.000Z';
  const later = '2026-11-01T02:00:00.000Z';
  const first = attemptEntries(question, { Q1_0: 'A' }, at);
  const second = attemptEntries(question, { Q1_0: 'A' }, later);
  assert.equal(first[0].choice, 'A');
  assert.equal(first[0].verdict, 'wrong');
  assert.equal(first[1].choice, null);
  assert.equal(first[1].verdict, 'open');
  assert.equal(parseAttemptEntry(first[0]).letter, undefined);
  assert.equal(parseAttemptEntry(first[0]).choice, 'A');
  assert.equal(parseAttemptEntry({ questionId: 'Q1', blankIndex: 0, choice: null, verdict: 'nope', at }), null);
  const rows = wrongLedger(question, [...first, ...second, attemptEntries(question, { Q1_0: 'B' }, later)[0]]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].count, 2);
  assert.equal(rows[0].name, 'A');
  assert.equal(rows[0].meaning, '');
  assert.match(ledgerLine(rows[0]), /A\u3000A\u30002次/);
  assert.equal(hasPickedWrong(['wrong', 'open']), true);
  assert.equal(hasPickedWrong(['skip']), false);
  assert.equal(hasPickedWrong(['right']), false);
});

test('sibling drills come from shared option names', () => {
  const named = (id, names) => ({
    id,
    title: id,
    blanks: [{ label: '本题', answer: names[0], letter: 'A', options: names.map((name) => ({ id: name.slice(0, 1), name, meaning: name, reason: name })) }],
  });
  const questions = [named('Q1', ['MVC风格', '管道']), named('Q7', ['管道', 'C2风格']), named('Q3', ['高扩展性'])];
  assert.deepEqual(siblingIds(questions, 'Q1'), ['Q7']);
  assert.deepEqual(drillIds(questions, 'Q1'), ['Q1', 'Q7']);
  assert.deepEqual(drillIds(questions, 'Q3'), []);
  assert.deepEqual(siblingIds(questions, 'Q9'), []);
});

test('an earlier note is shown only when the same blank is wrong again', () => {
  assert.equal(shanghaiDay('2026-10-09T15:59:00.000Z'), '2026-10-09');
  assert.equal(shanghaiDay('2026-10-09T16:00:00.000Z'), '2026-10-10');
  assert.equal(notesChanged(['', '', ''], ['一句', '', '']), true);
  assert.equal(notesChanged(['一句', '', ''], ['一句', '', '']), false);
  assert.equal(hasNoteText(['  ', '', '']), false);
  const history = [{ questionId: 'Q1', notes: ['管道把步骤串起来', '', ''], at: '2026-11-01T00:00:00.000Z' }];
  assert.equal(parseNoteEntry(history[0]).notes[0], '管道把步骤串起来');
  assert.equal(parseNoteEntry({ questionId: 'Q1', notes: ['仅一段'], at: '2026-11-01T00:00:00.000Z' }), null);
  const once = attemptEntries(question, { Q1_0: 'A' }, '2026-11-01T01:00:00.000Z');
  assert.equal(confrontation(question, once, history, 0), null);
  const twice = [...once, ...attemptEntries(question, { Q1_0: 'A' }, '2026-11-01T03:00:00.000Z')];
  const face = confrontation(question, twice, history, 0);
  assert.equal(face.blankIndex, 0);
  assert.equal(face.day, '2026-11-01');
  assert.match(face.text, /管道把步骤串起来/);
  assert.equal(face.letter, 'B');
  assert.equal(confrontationLine(face), `${face.day} 你写下：${face.text}`);
  const empty = confrontation(question, twice, [{ questionId: 'Q1', notes: ['  ', '', ''], at: '2026-11-01T00:00:00.000Z' }], 0);
  assert.equal(empty, null);
  const after = confrontation(question, twice, [{ questionId: 'Q1', notes: ['事后才写', '', ''], at: '2026-11-01T04:00:00.000Z' }], 0);
  assert.equal(after, null);
  const corrected = [...twice, ...attemptEntries(question, { Q1_0: 'B' }, '2026-11-01T05:00:00.000Z')];
  assert.equal(confrontation(question, corrected, history, 0), null);
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
