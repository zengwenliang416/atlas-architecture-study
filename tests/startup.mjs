import assert from 'node:assert/strict';
const nodes = new Map();
function node(id) {
 if (!nodes.has(id)) nodes.set(id, {innerHTML:'',textContent:'',value:'',style:{},dataset:{},classList:{add(){},toggle(){}},setAttribute(){},scrollIntoView(){}});
 return nodes.get(id);
}
globalThis.document = {getElementById:node,querySelectorAll:()=>[],querySelector:()=>node('sidebar'),addEventListener(){}};
globalThis.window = {matchMedia:()=>({matches:false})};
globalThis.localStorage = {getItem:()=>null,setItem(){}};
await import('../dist/controller.js');
assert.match(node('questionCards').innerHTML, /处理过程分解的架构风格/);
assert.match(node('questionCards').innerHTML, /管道-过滤器风格/);
assert.equal(node('totalCount').textContent,39);
node('expandBtn').onclick();
assert.equal((node('questionCards').innerHTML.match(/class="q-shell /g)||[]).length,39);
console.log('Startup passed: first question and all 39 cards render.');
assert.match(node('questionCards').innerHTML, /完整论文参考范文/);
assert.match(node('questionCards').innerHTML, /data-essaycase="Q22"/);
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
