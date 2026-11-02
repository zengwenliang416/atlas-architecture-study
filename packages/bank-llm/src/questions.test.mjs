import assert from 'node:assert/strict';
import test from 'node:test';
import { DATA } from './questions.js';

const lettersOf = (answer) => answer.split(/[、,，]/).map((part) => part.trim()).filter(Boolean);

test('大模型题库保持原文题量和编号', () => {
  assert.equal(DATA.length, 305);
  assert.deepEqual(
    DATA.map((question) => question.id),
    Array.from({ length: 305 }, (_, index) => `L${index + 1}`),
  );
  assert.equal(new Set(DATA.map((question) => question.id)).size, 305);
  const counts = { 填空题: 0, 单选题: 0, 多选题: 0, 判断题: 0 };
  for (const question of DATA) counts[question.kind] += 1;
  assert.deepEqual(counts, { 填空题: 42, 单选题: 94, 多选题: 78, 判断题: 91 });
});

test('答案字母都在选项里，填空答案非空，解析不编造', () => {
  for (const question of DATA) {
    assert.equal(question.blanks.length, 1, question.id);
    assert.equal(question.topic, '大模型');
    const blank = question.blanks[0];
    assert.ok(blank.answer.trim(), `${question.id} 答案为空`);
    assert.equal(question.concept, '');
    assert.equal(question.source, '');
    assert.deepEqual(question.steps, []);
    assert.deepEqual(question.core, []);
    if (!blank.options.length) {
      assert.equal(question.kind, '填空题');
      assert.equal(blank.letter, '');
      continue;
    }
    const ids = blank.options.map((option) => option.id);
    assert.deepEqual(new Set(ids).size, ids.length, question.id);
    for (const option of blank.options) {
      assert.equal(option.meaning, '');
      assert.equal(option.reason, '');
      assert.equal(option.correct, lettersOf(blank.letter).includes(option.id));
    }
    for (const letter of lettersOf(blank.letter)) {
      assert.ok(ids.includes(letter), `${question.id} 答案 ${letter} 不在 ${ids.join('')}`);
    }
    if (question.kind === '多选题') assert.ok(lettersOf(blank.letter).length > 1, question.id);
    if (question.kind === '判断题') {
      assert.deepEqual(blank.options.map((option) => option.name), ['对', '错']);
      assert.match(blank.letter, /^[AB]$/);
    }
    if (question.kind === '单选题') assert.equal(lettersOf(blank.letter).length, 1);
  }
});
