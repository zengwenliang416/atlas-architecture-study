import assert from 'node:assert/strict';
import { DATA } from '../src/data.js';
import { REVIEW_INTERVALS, plusDays } from '../src/storage.js';
assert.equal(DATA.length, 39, '题库应保留 39 道题');
assert.equal(new Set(DATA.map((q) => q.id)).size, DATA.length, '题目 ID 必须唯一');
for (const q of DATA) { assert.ok(q.title && q.topic && q.stem && Array.isArray(q.blanks), `${q.id} 缺少题目元数据`); assert.ok(q.blanks.length > 0, `${q.id} 至少需要一个填空/设问`); assert.ok(q.concept && q.steps?.length && q.core?.length, `${q.id} 缺少解析内容`); }
assert.deepEqual(REVIEW_INTERVALS, [0, 1, 2, 4, 7, 15, 30]);
assert.equal(plusDays('2026-10-09', 1), '2026-10-10');
console.log('Atlas smoke tests passed:', DATA.length, 'questions');
