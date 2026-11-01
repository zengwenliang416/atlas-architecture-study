import assert from 'node:assert/strict';
import { DATA } from '../src/data.js';
import { readFileSync } from 'node:fs';
import { REVIEW_INTERVALS, day, plusDays } from '../src/storage.js';
assert.equal(DATA.length, 39, '题库应保留 39 道题');
assert.equal(new Set(DATA.map((q) => q.id)).size, DATA.length, '题目 ID 必须唯一');
for (const q of DATA) { assert.ok(q.title && q.topic && q.stem && Array.isArray(q.blanks), `${q.id} 缺少题目元数据`); assert.ok(q.blanks.length > 0, `${q.id} 至少需要一个填空/设问`); assert.ok(q.concept && q.steps?.length && q.core?.length, `${q.id} 缺少解析内容`); }
assert.deepEqual(REVIEW_INTERVALS, [0, 1, 2, 4, 7, 15, 30]);
assert.equal(day(new Date('2026-10-09T15:59:00.000Z')), '2026-10-09');
assert.equal(day(new Date('2026-10-09T16:00:00.000Z')), '2026-10-10');
assert.equal(plusDays('2026-10-09', 1), '2026-10-10');
assert.equal(plusDays('2026-01-31', 1), '2026-02-01');
for (const cssPath of ['src/styles.css', 'apps/web/src/styles/app.css']) {
  const css = readFileSync(new URL(`../${cssPath}`, import.meta.url), 'utf8');
  const narrow = css.slice(css.indexOf('@media (max-width: 720px)'));
  assert.match(narrow, /calc\(112px \+ env\(safe-area-inset-bottom\)\)/, `${cssPath} 窄屏主内容要让出底栏`);
  assert.match(narrow, /#jumpTop \{ display: none; \}/, `${cssPath} 窄屏不显示顶部`);
}
console.log('Atlas smoke tests passed:', DATA.length, 'questions');
