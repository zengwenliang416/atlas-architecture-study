import { DATA } from './data.js';
import { createStudyRepository, day, plusDays, REVIEW_INTERVALS } from './storage.js';

// Controller/view module: the original interaction model is retained, while
// data and persistence are injected from dedicated modules.
const repository = createStudyRepository(DATA);
const db = repository.records;
const persist = () => { if (!repository.persist()) toast('当前浏览器无法持久保存学习记录'); };

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function toast(msg){const e=$('toast');e.textContent=msg;e.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.style.display='none',2400)}
let mode='focus',focusId='Q1',filter='all',keyword='',revealed=new Set(),activeBlanks={Q9:2},selected={},nodeFocus={};
const getBlank=q=>q.blanks[activeBlanks[q.id]||0];
const selectionKey=q=>q.id+'_'+(activeBlanks[q.id]||0);
const due=q=>db[q.id].next<=day();
const states={'new':'新学 / 不会','vague':'模糊','mastered':'已掌握'};
const SCHEDULE_PREVIEW=13;
const shanghaiClock=()=>new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});

function answersSummary(q){return q.blanks.map((b,i)=>`第${i+1}空：${b.letter?b.letter+' · ':''}${b.answer}`).join('　｜　')}
function optionHTML(q,b,reveal){
 if(!b.options.length)return `<div class="preclose">这一空的原始A/B/C/D选项未出现在对话中。<br>先写出术语，再揭晓</div>`;
 const pick=selected[selectionKey(q)];
 return `<div class="option-list">`+b.options.map(o=>{
 const chosen=pick===o.id;
 let cl='choice'+(chosen?' selected':'')+(reveal&&o.correct?' correct-revealed':'')+(reveal&&chosen&&!o.correct?' wrong-selected':'');
 return `<button type="button" class="${cl}" data-pick="${q.id}" data-choice="${o.id}" aria-pressed="${chosen}"><span class="letter">${esc(o.id)}</span><span>${esc(o.name)}</span></button>`;
 }).join('')+`</div>`;
}
function conceptHTML(q,reveal){
 const i=Math.min(q.steps.length-1,nodeFocus[q.id]||0);const step=q.steps[i];
 return `<div class="concept-wrap"><div class="concept-intro">${esc(q.concept)}</div>
 <div class="diagram" aria-label="可点击的知识概念流程图">${q.steps.map((s,j)=>`${j?'<span class="arrow" aria-hidden="true">→</span>':''}<button type="button" class="node ${i===j?'on':''}" data-node="${q.id}" data-step="${j}" aria-pressed="${i===j}">${esc(s[0])}</button>`).join('')}</div>
 <div class="node-desc"><b>${esc(step[0])}：</b>${esc(step[1])}</div><div class="concept-takeaway"><div class="concept-takeaway-title">关键记忆</div><ul>${q.summary.slice(0,3).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
}
let activeEssayCase={};
function essayHTML(q){
 if(!q.essay_cases)return '';
 const key=activeEssayCase[q.id]||'newapi';
 const name=key==='newapi'?'New API 企业级 AI 网关':'电商交易平台';
 const paras=q.essay_cases[key];
 return `<div class="essay-full" id="essay-${q.id}"><div class="essay-header"><div><h3>完整论文参考范文 · ${esc(name)}</h3><p>两篇均为教学示例；可切换阅读并复制，项目经历与量化数据应由本人真实事实替换。</p></div><div class="essay-tabs"><button type="button" class="small-btn ${key==='newapi'?'essay-selected':''}" data-essaycase="${q.id}" data-case="newapi">New API 网关</button><button type="button" class="small-btn ${key==='ecommerce'?'essay-selected':''}" data-essaycase="${q.id}" data-case="ecommerce">电商平台</button></div></div><div class="essay-copybar"><span>${esc(q.id)} · ${esc(q.title)}</span><button type="button" class="small-btn" data-copyessay="${q.id}">复制本文</button></div><div class="essay-body">${paras.map((s,i)=>`<section><h4>${esc(s[0])}</h4><p>${esc(s[1])}</p></section>`).join('')}</div></div>`;
}
function questionCard(q){
 const s=db[q.id],b=getBlank(q),reveal=revealed.has(q.id),pick=selected[selectionKey(q)];
 const open=!b.options.length;
 let response=open?'':'先选择一个选项，再揭晓';
 if(pick&&!reveal)response=`你选择了 ${esc(pick)}，答案仍遮着`;
 if(reveal)response=pick?(pick===b.letter?'回答正确':'你选择了 '+esc(pick)+'，本空应选 '+esc(b.letter||'概念填空')):'答案已揭晓';
 const blanks=q.blanks.length>1?`<div class="blanks">${q.blanks.map((x,i)=>`<button type="button" class="blanktab ${(activeBlanks[q.id]||0)===i?'active':''}" data-blank="${q.id}" data-bi="${i}">${esc(x.label)}</button>`).join('')}</div>`:'';
 const opdetail=b.options.length?b.options.map(o=>`<article class="opdetail ${o.correct?'correct':''}"><h4>${esc(o.id)}. ${esc(o.name)}</h4>
 <p><strong class="verdict">${o.correct?'正确':'不选'}</strong></p>
 <p><b>是什么：</b>${esc(o.meaning)}</p><p><b>为什么${o.correct?'对':'错'}：</b>${esc(o.reason)}</p></article>`).join(''):
 `<article class="opdetail"><h4>本空为概念填空</h4><p>原始独立选项未展示，不能推定正确选项字母。</p><p><b>标准术语：</b><span class="red">${esc(b.answer)}</span></p></article>`;
 const explanations=`<div class="takeaway-grid"><div>
 <div class="bluelabel">④ 核心知识点</div><ul class="explain-list">${q.core.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
 <div class="bluelabel">⑤ 小白例子</div><p class="summaryline">${esc(q.example)}</p></div>
 <div><div class="bluelabel">⑥ 易错点</div><ul class="explain-list">${q.pitfalls.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
 <div class="bluelabel">⑧ 图示：互动文字还原</div><ul class="explain-list">${q.summary.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>
 <div class="mnemonic">记忆口诀：${esc(q.motto)}</div>${essayHTML(q)}<div class="source"><b>⑦ 资料依据：</b>${esc(q.source)}</div>`;
 const blankAnswers=q.blanks.length>1?`<div class="blank-answer-list"><b>各空答案：</b>${q.blanks.map((x,i)=>`<div><span>${esc(x.label||`第${i+1}空`)}</span><strong>${esc(x.letter?x.letter+' · ':'')}${esc(x.answer)}</strong>${x.options?.length?'':'<em>（原题未提供选项）</em>'}</div>`).join('')}</div>`:'';
 const questions=blanks+optionHTML(q,b,reveal)+blankAnswers;
 return `<article class="q-shell ${reveal?'':'only-masked'} ${mode==='stems'&&!reveal?'stem-only':''}" id="${q.id}">
 <div class="q-heading"><div><h2><span class="q-id">${esc(q.id)}</span>${esc(q.title)}</h2><div class="meta-line">${esc(q.kind)}　/　${esc(q.topic)}　·　${q.blanks.length}个填空/设问</div></div>
 <div class="q-actions"><button type="button" class="small-btn reveal" data-reveal="${q.id}" aria-expanded="${reveal}">${reveal?'再次遮挡':'揭晓答案'}</button><button type="button" class="small-btn" data-toggle-feynman="${q.id}">费曼三问</button></div></div>
 <div class="zones">
 <section class="paper"><h3><span class="num">①</span>${reveal?'题目识别 / 正确答案':'题目识别'}</h3><span class="pill">${esc(q.topic)} · ${esc(q.kind)}</span>
 <div class="stem">${esc(q.stem)}</div>${questions}
 ${response?`<div class="response" role="status">${response}</div>`:''}<div class="answer ${reveal?'':'hidden'}">答案：${esc(b.letter||'原题未给字母')} · ${esc(b.answer)}${q.blanks.length>1?`<div style="font-size:13px;font-weight:500;margin-top:4px">全题：${esc(answersSummary(q))}</div>`:''}</div>
 ${!reveal?'<div class="lock">答案和解析先遮着</div>':''}</section>
 <section class="paper"><h3><span class="num">②</span>概念</h3>${conceptHTML(q,reveal)}</section>
 <section class="paper middle revealed-only"><h3><span class="num">③</span>四个选项逐项解析 <span class="pill">是什么 · 对错 · 为什么</span></h3><div class="option-grid">${opdetail}</div></section>
 <section class="paper lower revealed-only"><h3><span class="num">④</span>总结、例子、易错点与口诀</h3>${explanations}</section>
 </div>
 <section class="feynman" id="feynman-${q.id}"><h3>费曼三问</h3><p>写下来就会保存。讲得越像给零基础同学解释，掌握得越稳。</p>
 <div class="feynman-grid">${['① 我怎么讲给零基础同学听？','② 我卡在哪个步骤或选项？','③ 如果只留一句，我记住什么？'].map((label,i)=>`<div class="fyn"><label for="fyn-${q.id}-${i}">${label}</label><textarea id="fyn-${q.id}-${i}" data-note="${q.id}" data-ni="${i}" placeholder="用自己的话写">${esc(s.notes[i]||'')}</textarea></div>`).join('')}</div></section>
 <div class="statusbar"><div class="state-group"><span class="recordline" style="padding-top:9px">掌握程度：</span>${[['new','新学/不会'],['vague','模糊'],['mastered','已掌握']].map(([v,label])=>`<button class="state-btn ${s.level===v?'active '+v:''}" data-status="${q.id}" data-value="${v}" aria-pressed="${s.level===v}">${label}</button>`).join('')}</div>
 <div class="recordline">上次标记：${esc(s.last||'未标记')}<br>下一次复习：<b>${esc(s.next)}</b>　已复习：${s.count}次</div>
 <button type="button" class="reviewbtn" data-complete="${q.id}" ${s.lastReviewedOn===day()?'disabled aria-disabled="true"':''}>${s.lastReviewedOn===day()?'今日已复习':'今天复习完'}</button></div>
 </article>`;
}
function matches(q){
 if(filter==='due'&&!due(q))return false;
 if(['new','vague','mastered'].includes(filter)&&db[q.id].level!==filter)return false;
 if(keyword){const s=[q.title,q.topic,q.stem,q.concept,q.motto,q.example,...q.blanks.flatMap(b=>[b.answer,...b.options.flatMap(o=>[o.name,o.reason,o.meaning])])].join(' ').toLowerCase();if(!s.includes(keyword.toLowerCase()))return false}
 return true;
}
function eligible(){return DATA.filter(matches)}
function recalc(){
 const counters={new:0,vague:0,mastered:0};DATA.forEach(q=>counters[db[q.id].level]++);
 $('totalCount').textContent=DATA.length;$('newCount').textContent=counters.new;$('vagueCount').textContent=counters.vague;$('knownCount').textContent=counters.mastered;const pct=Math.round(counters.mastered/DATA.length*100);$('heroPct').textContent=pct+'% 已掌握';$('heroProgress').style.width=pct+'%';
 const num=DATA.filter(due).length;$('dueNum').textContent=num;$('sideDue').textContent=num;
}
function renderTOC(){
 $('toc').innerHTML=DATA.filter(matches).map(q=>`<button type="button" class="toc-item ${q.id===focusId?'active':''}" data-jump="${q.id}"><span class="toc-id">${q.id}</span><span class="toc-name">${esc(q.title)}</span><span class="dot ${db[q.id].level}"></span></button>`).join('')||'<div class="empty">没有匹配的题目</div>';
 document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));
}
function renderQuestions(){
 const list=eligible();const show=(mode==='all'||mode==='due'||mode==='stems')?list:(list.find(q=>q.id===focusId)?[list.find(q=>q.id===focusId)]:list.slice(0,1));
 if(mode==='focus'&&show[0])focusId=show[0].id;
 else if(list.length&&!list.some(q=>q.id===focusId))focusId=list[0].id;
 const a=$('questionCards');a.innerHTML=show.length?show.map(questionCard).join(''):'<div class="empty">这个筛选下没有题目</div>';
 const currIndex=list.findIndex(q=>q.id===focusId);
 $('modeLabel').textContent=mode==='all'?'全部题目':mode==='due'?'今日到期':mode==='stems'?'只看题干':'逐题学习';
 $('modeHint').textContent=mode==='focus'?`第 ${list.length&&currIndex>=0?currIndex+1:0} / ${list.length} 题，方向键切题，1 到 4 选择，Enter 揭晓`:`列出 ${show.length} 题`;
 const dockPos=currIndex<0?0:currIndex+1;
 $('prevBtn').disabled=currIndex<=0;$('nextBtn').disabled=currIndex<0||currIndex>=list.length-1;$('dockCounter').innerHTML='Q'+dockPos+' <small>/ '+list.length+'</small>';$('mobilePrev').disabled=currIndex<=0;$('mobileNext').disabled=currIndex<0||currIndex>=list.length-1;
}
function planRows(items,dateText,overflow){
 const shown=items.slice(0,SCHEDULE_PREVIEW);
 const rows=shown.map(q=>`<div class="dueitem"><a href="#${q.id}" data-link="${q.id}">${q.id} ${esc(q.title)}</a><span class="duedate">${dateText(q)}</span></div>`).join('');
 const rest=items.length-shown.length;
 return rows+(rest>0?`<p>还有 ${rest} 道。${overflow}</p>`:'');
}
function renderPlan(){
 const dueItems=DATA.filter(due);const nextItems=DATA.filter(q=>!due(q)).sort((a,b)=>db[a.id].next.localeCompare(db[b.id].next));
 $('todayList').innerHTML=dueItems.length?planRows(dueItems,q=>'到期 '+esc(db[q.id].next),'用「今日到期」在目录里逐题看。'):'<p>今天没有到期的题目</p>';
 $('futureList').innerHTML=nextItems.length?planRows(nextItems,q=>esc(db[q.id].next),''):'<p class="lock">暂时没有未来复习安排</p>';
}
function rerender(){recalc();renderTOC();renderQuestions();renderPlan()}
function jump(id){
 if(!DATA.find(q=>q.id===id))return;
 if(!matches(DATA.find(q=>q.id===id))){filter='all';keyword='';$('search').value=''}
 focusId=id;mode='focus';rerender();$('questionArea').scrollIntoView({behavior:'smooth',block:'start'});
}
function changeBlank(id,index){activeBlanks[id]=index;renderQuestions()}
function markLevel(id,value){db[id].level=value;db[id].last=shanghaiClock();persist();rerender();toast(id+' 已标记为 '+states[value])}
function complete(id){
 const s=db[id];if(s.lastReviewedOn===day()){toast("今天已经复习过这道题，明天继续更有效");return;}s.lastReviewedOn=day();s.count++;s.stage=Math.min(s.stage+1,6);s.next=plusDays(day(),REVIEW_INTERVALS[s.stage]);s.last=shanghaiClock();persist();rerender();toast(id+' 复习完成，下次 '+s.next);
}
function showAll(){mode='all';filter='all';keyword='';$('search').value='';rerender();$('questionArea').scrollIntoView({behavior:'smooth',block:'start'})}
function maskAll(){revealed.clear();mode='stems';filter='all';keyword='';$('search').value='';rerender();$('questionArea').scrollIntoView({behavior:'smooth',block:'start'})}
 $('startBtn').onclick=()=>{revealed.clear();filter='all';keyword='';$('search').value='';focusId='Q1';mode='focus';rerender();$('questionArea').scrollIntoView({behavior:'smooth',block:'start'});toast('先选答案，再揭晓')};
$('dueBtn').onclick=()=>{filter='due';keyword='';$('search').value='';mode='due';rerender();$('questionArea').scrollIntoView({behavior:'smooth',block:'start'})};
$('expandBtn').onclick=showAll;$('stemBtn').onclick=maskAll;
$('search').oninput=e=>{keyword=e.target.value;mode='all';rerender()};
$('prevBtn').onclick=()=>{const arr=eligible(),i=arr.findIndex(q=>q.id===focusId);if(i>0)jump(arr[i-1].id)};$('mobilePrev').onclick=()=> $('prevBtn').click();
$('nextBtn').onclick=()=>{const arr=eligible(),i=arr.findIndex(q=>q.id===focusId);if(i<arr.length-1)jump(arr[i+1].id)};$('mobileNext').onclick=()=> $('nextBtn').click();
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(b){
 if(b.dataset.filter){filter=b.dataset.filter;mode=filter==='due'?'due':'all';rerender();return}
 if(b.dataset.jump){jump(b.dataset.jump);return}
 if(b.dataset.reveal){const id=b.dataset.reveal;revealed.has(id)?revealed.delete(id):revealed.add(id);renderQuestions();return}
 if(b.dataset.blank){changeBlank(b.dataset.blank,+b.dataset.bi);return}
 if(b.dataset.pick){const q=DATA.find(x=>x.id===b.dataset.pick);selected[selectionKey(q)]=b.dataset.choice;renderQuestions();return}
 if(b.dataset.node){nodeFocus[b.dataset.node]=+b.dataset.step;renderQuestions();return}
 if(b.dataset.status){markLevel(b.dataset.status,b.dataset.value);return}
 if(b.dataset.complete){complete(b.dataset.complete);return}
  if(b.dataset.essaycase){activeEssayCase[b.dataset.essaycase]=b.dataset.case;renderQuestions();return}
  if(b.dataset.copyessay){const q=DATA.find(x=>x.id===b.dataset.copyessay),key=activeEssayCase[q.id]||'newapi';const name=key==='newapi'?'New API 企业级 AI 网关':'电商交易平台';const t=q.id+' '+q.title+'\n'+name+'\n\n'+q.essay_cases[key].map(s=>s[0]+'\n'+s[1]).join('\n\n');copyText(t);return}
 if(b.dataset.toggleFeynman){$('feynman-'+b.dataset.toggleFeynman)?.scrollIntoView({behavior:'smooth',block:'center'});return}
 }
 const a=e.target.closest('[data-link]');if(a){e.preventDefault();jump(a.dataset.link)}
});
document.addEventListener('input',e=>{
 if(e.target.dataset.note){const id=e.target.dataset.note;const i=+e.target.dataset.ni;db[id].notes[i]=e.target.value;persist()}
});
async function copyText(text){
 try{if(!navigator.clipboard?.writeText)throw Error('no clipboard');await navigator.clipboard.writeText(text);toast('论文正文已复制')}catch(e){const box=$('fallback');box.style.display='block';box.value=text;box.focus();box.select();try{document.execCommand('copy');toast('内容已复制，必要时可手动复制')}catch(_){toast('请从底部文本框手动复制')}}
}
function exportNotes(){const lines=['系统架构设计师 · 对话题库费曼笔记','导出日期：'+new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}),'题目总数：'+DATA.length,'======================='];
 for(const q of DATA){const s=db[q.id];lines.push('',q.id+' '+q.title,'题目：'+q.stem,'答案：'+answersSummary(q),'状态：'+states[s.level]+'；复习次数：'+s.count+'；下一次：'+s.next,'费曼一问：'+(s.notes[0]||'（未填写）'),'费曼二问：'+(s.notes[1]||'（未填写）'),'费曼三问：'+(s.notes[2]||'（未填写）'),'-----------------------')}
 return lines.join('\n')}
$('exportBtn').onclick=async()=>{
 const text=exportNotes();try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);toast('全部费曼笔记已复制到剪贴板')}
 catch(e){const box=$('fallback');box.style.display='block';box.value=text;box.focus();box.select();try{if(document.execCommand('copy'))toast('费曼笔记已复制');else toast('可在下方文本框手动复制')}catch(_){toast('请在下方文本框手动复制')}}
};
if(window.matchMedia('(max-width:850px)').matches){document.querySelector('.sidebar').classList.add('collapsed')}
$('toggleSidebar').onclick=()=>{const bar=document.querySelector('.sidebar');const hidden=bar.classList.toggle('collapsed');$('toggleSidebar').textContent=hidden?'展开目录':'收起目录';$('toggleSidebar').setAttribute('aria-expanded',String(!hidden))};
rerender();

// 轻量键盘快捷键；输入框、选项按钮聚焦时不会截获按键。
document.addEventListener('keydown',e=>{
 const t=e.target;
 if(e.ctrlKey||e.metaKey||e.altKey||t?.isContentEditable)return;
 if(['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(t?.tagName))return;
 if(mode!=='focus')return;
 if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
  e.preventDefault();(e.key==='ArrowLeft'?$('prevBtn'):$('nextBtn')).click();
 }else if(/^[1-4]$/.test(e.key)){
  const q=DATA.find(x=>x.id===focusId);
  if(!q)return;
  const option=getBlank(q).options[Number(e.key)-1];
  if(option){
   e.preventDefault();
   const button=document.querySelector('[data-pick="'+q.id+'"][data-choice="'+option.id+'"]');
   if(button)button.click();
  }
 }else if(e.key==='Enter'){
  e.preventDefault();
  document.querySelector('[data-reveal="'+focusId+'"]')?.click();
 }
});
