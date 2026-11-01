import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const nodes = new Map();
const listeners = {};
const saved = [];
function node(id) {
 if (!nodes.has(id)) nodes.set(id, {
  innerHTML:'', textContent:'', value:'', style:{}, dataset:{},
  classList:{add(){},toggle(){return false;}},
  setAttribute(){}, removeAttribute(){}, scrollIntoView(){},
  click(){ this.onclick?.(); },
 });
 return nodes.get(id);
}
globalThis.document = {
 getElementById:node,
 querySelectorAll:()=>[],
 querySelector(selector){ return selector === '.sidebar' ? node('sidebar') : null; },
 addEventListener(type, fn){ listeners[type] = fn; },
};
globalThis.window = {matchMedia:()=>({matches:false})};
globalThis.localStorage = {getItem:()=>null,setItem(_key, value){ saved.push(String(value)); }};
await import('../dist/controller.js');
assert.match(node('questionCards').innerHTML, /处理过程分解的架构风格/);
assert.match(node('questionCards').innerHTML, /管道-过滤器风格/);
assert.match(node('modeHint').textContent, /\[ \] 换空，Enter 揭晓，揭晓后 c 完成/);
assert.match(node('questionCards').innerHTML, /data-complete="Q1" disabled/);
assert.match(node('questionCards').innerHTML, /先留下一句自己的话，再标今天复习完/);
assert.doesNotMatch(node('questionCards').innerHTML, /揭晓此空|仍要完成|命令面板|快捷键一览/);
assert.equal(node('totalCount').textContent,39);
node('expandBtn').onclick();
assert.equal((node('questionCards').innerHTML.match(/class="q-shell /g)||[]).length,39);
assert.equal(node('modeLabel').textContent, '全部题目');
assert.doesNotMatch(node('questionCards').innerHTML, /题目识别 \/ 正确答案/);
assert.equal((node('questionCards').innerHTML.match(/揭晓答案/g) || []).length, 39);
assert.ok((node('questionCards').innerHTML.match(/揭晓此空/g) || []).length > 1);
assert.equal((node('questionCards').innerHTML.match(/data-open="true"/g) || []).length, 0);
assert.doesNotMatch(node('questionCards').innerHTML, /correct-revealed|fbda83/);
assert.equal((node('todayList').innerHTML.match(/class="dueitem"/g) || []).length, 13);
assert.match(node('todayList').innerHTML, /还有 26 道/);
assert.match(node('questionCards').innerHTML, /完整论文参考范文/);
assert.match(node('questionCards').innerHTML, /data-essaycase="Q22"/);
assert.match(node('questionCards').innerHTML, /Q22 · /);
assert.match(node('questionCards').innerHTML, /复制本文/);
assert.doesNotMatch(node('questionCards').innerHTML, /《论负载均衡技术》/);
node('search').value = 'ATAM 架构权衡分析方法';
node('search').oninput({ target: { value: 'ATAM 架构权衡分析方法' } });
const filtered = (node('questionCards').innerHTML.match(/class="q-shell /g) || []).length;
assert.ok(filtered > 0 && filtered < 39, `筛选后应少于整库，实际 ${filtered}`);
assert.match(node('dockCounter').innerHTML, new RegExp(`/ ${filtered}<`));
assert.doesNotMatch(node('dockCounter').innerHTML, /\/ 39/);
assert.equal((node('questionCards').innerHTML.match(/揭晓答案/g) || []).length, filtered);
console.log('Startup passed: first question and all 39 cards render.');
const { DATA } = await import('../dist/data.js');
const { createStudyRepository } = await import('../dist/storage.js');
const legacy = {Q1:{level:'mastered',notes:['原有笔记','',''],count:4,stage:2,next:'2026-12-01'}};
const repository = createStudyRepository(DATA,{getItem:()=>JSON.stringify(legacy),setItem(){}});
assert.equal(repository.records.Q1.notes[0],'原有笔记');
assert.equal(repository.records.Q1.count,4);
assert.equal(repository.records.Q14.level,'new');
assert.equal(repository.records.Q22.notes[0],'');
assert.ok(DATA[21].essay_cases.newapi.length);
assert.ok(DATA[21].essay_cases.ecommerce.length);
console.log('Merge passed: legacy notes preserved, new records independent, both essay cases present.');

function sliceCard(id) {
 const html = node('questionCards').innerHTML;
 const token = `id="${id}"`;
 const idAt = html.indexOf(token);
 assert.ok(idAt >= 0, id);
 const start = html.lastIndexOf('<article class="q-shell', idAt);
 const next = html.indexOf('<article class="q-shell', idAt + token.length);
 return html.slice(start, next === -1 ? html.length : next);
}
function press(key, tag = 'DIV') {
 const event = { key, target:{tagName:tag, isContentEditable:false}, ctrlKey:false, metaKey:false, altKey:false, preventDefault(){ event.defaulted = true; } };
 listeners.keydown(event);
 return event;
}
function clickButton(dataset) {
 listeners.click({ target:{ closest(selector){ return selector === 'button' ? { dataset } : null; } } });
}
node('startBtn').onclick();
clickButton({ complete:'Q1' });
assert.match(sliceCard('Q1'), /已复习：0次/);
assert.match(node('toast').textContent, /先留下一句自己的话，再标今天复习完/);
listeners.input({ target:{ dataset:{ note:'Q1', ni:'2' }, value:'   ' } });
clickButton({ filter:'all' });
assert.match(sliceCard('Q1'), /data-complete="Q1" disabled/);
listeners.input({ target:{ dataset:{ note:'Q1', ni:'2' }, value:'只留一句：管道串步骤' } });
clickButton({ filter:'all' });
assert.match(sliceCard('Q1'), /data-complete="Q1"\s*>今天复习完/);
assert.match(sliceCard('Q1'), /data-gate="Q1" hidden/);
assert.match(sliceCard('Q1'), /data-ni="0" placeholder="用自己的话写"><\/textarea>/);
node('startBtn').onclick();
assert.equal(press('[').defaulted, undefined);
assert.doesNotMatch(sliceCard('Q1'), /blanktab/);
press('1');
assert.match(sliceCard('Q1'), /class="choice selected"/);
press('c');
assert.match(sliceCard('Q1'), /已复习：0次/);
press('Enter');
assert.match(sliceCard('Q1'), /题目识别 \/ 正确答案/);
press('c', 'TEXTAREA');
assert.match(sliceCard('Q1'), /已复习：0次/);
press('c');
assert.match(sliceCard('Q1'), /今日已复习/);
assert.match(sliceCard('Q1'), /已复习：1次/);
clickButton({ jump:'Q10' });
assert.equal(node('dockCounter').innerHTML, 'Q10 <small>/ 39</small>');
assert.match(sliceCard('Q10'), /data-reveal-blank="Q10"[^>]*disabled/);
clickButton({ revealBlank:'Q10' });
assert.doesNotMatch(sliceCard('Q10'), /correct-revealed|data-open="true"|题目识别 \/ 正确答案/);
press(']');
assert.match(sliceCard('Q10'), /class="blanktab active"[^>]*>第2空/);
assert.doesNotMatch(sliceCard('Q10'), /data-reveal-blank="Q10"[^>]*disabled/);
clickButton({ revealBlank:'Q10' });
assert.match(sliceCard('Q10'), /only-masked/);
assert.match(sliceCard('Q10'), /data-open="true"/);
assert.match(sliceCard('Q10'), /data-open="false"/);
assert.doesNotMatch(sliceCard('Q10'), /data-open="false"><span>[^<]*<\/span><strong>/);
assert.doesNotMatch(sliceCard('Q10'), /题目识别 \/ 正确答案/);
press('[');
press('1');
clickButton({ revealBlank:'Q10' });
assert.match(sliceCard('Q10'), /correct-revealed/);
assert.doesNotMatch(sliceCard('Q10'), /data-open="false"/);
press('Enter');
assert.match(sliceCard('Q10'), /题目识别 \/ 正确答案/);
assert.doesNotMatch(sliceCard('Q10'), /only-masked/);
press('Enter');
assert.match(sliceCard('Q10'), /only-masked/);
assert.doesNotMatch(sliceCard('Q10'), /题目识别 \/ 正确答案/);
assert.match(sliceCard('Q10'), /data-open="true"/);
listeners.input({ target:{ dataset:{ note:'Q10', ni:'0' }, value:'进程看并发' } });
press('c');
assert.match(sliceCard('Q10'), /已复习：0次/);
press('Enter');
press('c');
assert.match(sliceCard('Q10'), /今日已复习/);
assert.match(sliceCard('Q10'), /已复习：1次/);
press('ArrowLeft');
assert.match(sliceCard('Q9'), /DSSA三阶段及产物/);
assert.match(sliceCard('Q9'), /class="blanktab active"[^>]*>第3空（有选项）/);
assert.equal(node('dockCounter').innerHTML, 'Q9 <small>/ 39</small>');
assert.ok(saved.length > 0);
assert.doesNotMatch(saved.at(-1), /"revealed"/);
const cardSource = readFileSync(new URL('../apps/web/src/features/study/components/question-card.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../apps/web/src/features/study/study-page.tsx', import.meta.url), 'utf8');
const reducerSource = readFileSync(new URL('../apps/web/src/features/study/study-reducer.ts', import.meta.url), 'utf8');
assert.match(cardSource, /先留下一句自己的话，再标今天复习完/);
assert.match(cardSource, /揭晓此空/);
assert.match(cardSource, /遮挡此空/);
assert.doesNotMatch(cardSource, /仍要完成/);
assert.ok(pageSource.includes("event.key === '['") && pageSource.includes("event.key === ']'"));
assert.ok(pageSource.includes("event.key === 'c'"));
assert.match(pageSource, /ui\.revealed\.includes\(focusId\)/);
assert.match(pageSource, /揭晓后 c 完成/);
assert.match(pageSource, /body: '\{\}'/);
assert.match(reducerSource, /revealedBlanks/);
assert.doesNotMatch(reducerSource, /study_record/);
for (const cssPath of ['src/styles.css', 'apps/web/src/styles/app.css', 'dist/styles.css']) {
 const css = readFileSync(new URL(`../${cssPath}`, import.meta.url), 'utf8');
 assert.match(css, /\.margin-rule \{[^}]*border-left: 2px solid var\(--pen\)/);
 assert.equal((css.match(/position:\s*fixed/g) || []).length, 3, cssPath);
 assert.doesNotMatch(css, /fbda83|cheatsheet|命令面板/);
}
console.log('Desk passed: Feynman gate, blank keys, and per-blank reveal.');
