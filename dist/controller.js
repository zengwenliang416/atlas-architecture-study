import { DATA } from './data.js';
import {
  LEDGER_TITLE,
  SCHEDULE_PREVIEW,
  answersSummary,
  attemptEntries,
  attemptOf,
  blankStatusText,
  blankStorageKey,
  canRevealBlank,
  choiceClass,
  compareLine,
  compareRows,
  confrontation,
  confrontationLine,
  hasPickedWrong,
  drillIds,
  hasWrongBlank,
  ledgerLine,
  monthLoad,
  siblingIds,
  tallyRows,
  tallyText,
  wrongLedger,
} from './desk.js';
import { appendAttemptLog, appendNoteHistory, createStudyRepository, day, plusDays, readAttemptLog, readNoteHistory, REVIEW_INTERVALS } from './storage.js';

// Controller/view module: the original interaction model is retained, while
// data and persistence are injected from dedicated modules.
const repository = createStudyRepository(DATA);
const db = repository.records;
let attemptLog = readAttemptLog();
let noteHistory = readNoteHistory();
const persist = () => { if (!repository.persist()) toast('当前浏览器无法持久保存学习记录'); };

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function toast(msg){const e=$('toast');e.textContent=msg;e.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.style.display='none',2400)}
let mode='focus',focusId='Q1',filter='all',keyword='',revealed=new Set(),activeBlanks={Q9:2},selected={},nodeFocus={};
let exam=null,compare=null;
const revealedBlanks=new Set();
const noted=notes=>notes.some(part=>String(part).trim());
const getBlank=q=>q.blanks[activeBlanks[q.id]||0];
const selectionKey=q=>blankStorageKey(q.id,activeBlanks[q.id]||0);
const due=q=>db[q.id].next<=day();
const states={'new':'新学 / 不会','vague':'模糊','mastered':'已掌握'};
const shanghaiClock=()=>new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});

function optionHTML(q,b,reveal){
 if(!b.options.length)return `<div class="preclose">这一空的原始A/B/C/D选项未出现在对话中。<br>先写出术语，再揭晓</div>`;
 const pick=selected[selectionKey(q)];
 return `<div class="option-list">`+b.options.map(o=>{
 const chosen=pick===o.id;
 const cl=choiceClass({chosen,open:reveal,correct:o.correct});
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
function essayDraftHTML(q){
 if(!q.essay_cases)return '';
 return `<section class="paper essay-draft"><h3>先写再对照</h3><p>草稿随这道题留在这台浏览器，不改范文。</p><textarea data-essay="${q.id}" placeholder="先写自己的论述">${esc(db[q.id].essay||'')}</textarea></section>`;
}
function essayHTML(q){
 if(!q.essay_cases)return '';
 const key=activeEssayCase[q.id]||'newapi';
 const name=key==='newapi'?'New API 企业级 AI 网关':'电商交易平台';
 const paras=q.essay_cases[key];
 return `<div class="essay-full" id="essay-${q.id}"><div class="essay-header"><div><h3>完整论文参考范文 · ${esc(name)}</h3><p>两篇均为教学示例；可切换阅读并复制，项目经历与量化数据应由本人真实事实替换。</p></div><div class="essay-tabs"><button type="button" class="small-btn ${key==='newapi'?'essay-selected':''}" data-essaycase="${q.id}" data-case="newapi">New API 网关</button><button type="button" class="small-btn ${key==='ecommerce'?'essay-selected':''}" data-essaycase="${q.id}" data-case="ecommerce">电商平台</button></div></div><div class="essay-copybar"><span>${esc(q.id)} · ${esc(q.title)}</span><button type="button" class="small-btn" data-copyessay="${q.id}">复制本文</button></div><div class="essay-body">${paras.map((s,i)=>`<section><h4>${esc(s[0])}</h4><p>${esc(s[1])}</p></section>`).join('')}</div></div>`;
}
function questionCard(q){
 const s=db[q.id],b=getBlank(q),cardReveal=revealed.has(q.id),pick=selected[selectionKey(q)];
 const blankKey=selectionKey(q);
 const blankOpen=cardReveal||revealedBlanks.has(blankKey);
 const response=esc(blankStatusText({optionCount:b.options.length,selected:pick,letter:b.letter,open:blankOpen}));
 const blanks=q.blanks.length>1?`<div class="blanks">${q.blanks.map((x,i)=>`<button type="button" class="blanktab ${(activeBlanks[q.id]||0)===i?'active':''}" data-blank="${q.id}" data-bi="${i}">${esc(x.label)}</button>`).join('')}</div>`:'';
 const blankAt=activeBlanks[q.id]||0;
 const face=confrontation(q, attemptLog, noteHistory, blankAt);
 const opdetail=b.options.length?b.options.map(o=>`<article class="opdetail ${o.correct?'correct':''}"><h4>${esc(o.id)}. ${esc(o.name)}</h4>
 <p><strong class="verdict">${o.correct?'正确':'不选'}</strong></p>
 <p><b>是什么：</b>${esc(o.meaning)}</p><p><b>为什么${o.correct?'对':'错'}：</b>${esc(o.reason)}</p>${o.correct&&face?`<p class="margin-rule">${esc(confrontationLine(face))}</p>`:''}</article>`).join(''):
 `<article class="opdetail"><h4>本空为概念填空</h4><p>原始独立选项未展示，不能推定正确选项字母。</p><p><b>标准术语：</b><span class="red">${esc(b.answer)}</span></p></article>`;
 const explanations=`<div class="takeaway-grid"><div>
 <div class="bluelabel">④ 核心知识点</div><ul class="explain-list">${q.core.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
 <div class="bluelabel">⑤ 小白例子</div><p class="summaryline">${esc(q.example)}</p></div>
 <div><div class="bluelabel">⑥ 易错点</div><ul class="explain-list">${q.pitfalls.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
 <div class="bluelabel">⑧ 图示：互动文字还原</div><ul class="explain-list">${q.summary.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>
 <div class="mnemonic">记忆口诀：${esc(q.motto)}</div>${essayHTML(q)}<div class="source"><b>⑦ 资料依据：</b>${esc(q.source)}</div>`;
 const anyBlankOpen=q.blanks.some((_,i)=>cardReveal||revealedBlanks.has(q.id+'_'+i));
 const blankAnswers=q.blanks.length>1&&anyBlankOpen?`<div class="blank-answer-list"><b>各空答案：</b>${q.blanks.map((x,i)=>{
  const rowOpen=cardReveal||revealedBlanks.has(q.id+'_'+i);
  const answer=rowOpen?`<strong>${esc(x.letter?x.letter+' · ':'')}${esc(x.answer)}</strong>${x.options?.length?'':'<em>（原题未提供选项）</em>'}`:'';
  return `<div class="blank-row" data-open="${rowOpen?'true':'false'}"><span>${esc(x.label||`第${i+1}空`)}</span>${answer}</div>`;
 }).join('')}</div>`:'';
 const canOpenBlank=canRevealBlank(b.options.length,pick,blankOpen);
 const blankToggle=q.blanks.length>1&&!cardReveal?`<button type="button" class="small-btn blank-reveal" data-reveal-blank="${q.id}" aria-expanded="${blankOpen?'true':'false'}" ${canOpenBlank?'':'disabled'}>${blankOpen?'遮挡此空':'揭晓此空'}</button>`:'';
 const ledgerRows=blankOpen?wrongLedger(q, attemptLog).filter(row=>row.blankIndex===blankAt):[];
 const ledger=ledgerRows.length?`<div class="ledger"><h3>${LEDGER_TITLE}</h3>${ledgerRows.map(row=>`<p>${esc(ledgerLine(row))}</p>`).join('')}</div>`:'';
 const questions=blanks+optionHTML(q,b,blankOpen)+blankToggle+blankAnswers;
 const ready=noted(s.notes);
 const reviewed=s.lastReviewedOn===day();
 const summary=cardReveal&&q.blanks.length>1?`<div style="font-size:13px;font-weight:500;margin-top:4px">全题：${esc(answersSummary(q))}</div>`:'';
 const lock=cardReveal?'':`<div class="lock">${blankOpen?'讲解仍遮着':'答案和解析先遮着'}</div>`;
 return `<article class="q-shell ${cardReveal?'':'only-masked'} ${mode==='stems'&&!cardReveal?'stem-only':''}" id="${q.id}">
 <div class="q-heading"><div><h2><span class="q-id">${esc(q.id)}</span>${esc(q.title)}</h2><div class="meta-line">${esc(q.kind)}　/　${esc(q.topic)}　·　${q.blanks.length}个填空/设问</div></div>
 <div class="q-actions"><button type="button" class="small-btn reveal" data-reveal="${q.id}" aria-expanded="${cardReveal}">${cardReveal?'再次遮挡':'揭晓答案'}</button>${hasPickedWrong(s.attempt)&&siblingIds(DATA,q.id).length?`<button type="button" class="small-btn" data-drill="${q.id}">同组辨析</button>`:''}<button type="button" class="small-btn" data-toggle-feynman="${q.id}">费曼三问</button></div></div>
 <div class="zones">
 <section class="paper"><h3><span class="num">①</span>${cardReveal?'题目识别 / 正确答案':'题目识别'}</h3><span class="pill">${esc(q.topic)} · ${esc(q.kind)}</span>
 <div class="stem">${esc(q.stem)}</div>${questions}
 ${response?`<div class="response" role="status">${response}</div>`:''}<div class="answer ${blankOpen?'':'hidden'}">答案：${esc(b.letter||'原题未给字母')} · ${esc(b.answer)}${summary}</div>
 ${ledger}
 ${lock}</section>
 <section class="paper"><h3><span class="num">②</span>概念</h3>${conceptHTML(q,cardReveal)}</section>
 <section class="paper middle revealed-only"><h3><span class="num">③</span>四个选项逐项解析 <span class="pill">是什么 · 对错 · 为什么</span></h3><div class="option-grid">${opdetail}</div></section>
 ${essayDraftHTML(q)}
 <section class="paper lower revealed-only"><h3><span class="num">④</span>总结、例子、易错点与口诀</h3>${explanations}</section>
 </div>
 <section class="feynman" id="feynman-${q.id}"><h3>费曼三问</h3><p>写下来就会保存。讲得越像给零基础同学解释，掌握得越稳。</p>
 <div class="feynman-grid">${['① 我怎么讲给零基础同学听？','② 我卡在哪个步骤或选项？','③ 如果只留一句，我记住什么？'].map((label,i)=>`<div class="fyn"><label for="fyn-${q.id}-${i}">${label}</label><textarea id="fyn-${q.id}-${i}" data-note="${q.id}" data-ni="${i}" placeholder="用自己的话写">${esc(s.notes[i]||'')}</textarea></div>`).join('')}</div></section>
 <div class="statusbar"><div class="state-group"><span class="recordline" style="padding-top:9px">掌握程度：</span>${[['new','新学/不会'],['vague','模糊'],['mastered','已掌握']].map(([v,label])=>`<button class="state-btn ${s.level===v?'active '+v:''}" data-status="${q.id}" data-value="${v}" aria-pressed="${s.level===v}">${label}</button>`).join('')}</div>
 <div class="recordline">上次标记：${esc(s.last||'未标记')}<br>下一次复习：<b>${esc(s.next)}</b>　已复习：${s.count}次</div>
 <div class="review-mark"><button type="button" class="reviewbtn" data-complete="${q.id}" ${reviewed||!ready?'disabled aria-disabled="true"':''}>${reviewed?'今日已复习':'今天复习完'}</button><p class="margin-rule" data-gate="${q.id}" ${reviewed||ready?'hidden':''}>先留下一句自己的话，再标今天复习完。</p></div></div>
 </article>`;
}
function matches(q){
 if(filter==='due'&&!due(q))return false;
 if(filter==='wrong'&&!hasWrongBlank(db[q.id].attempt))return false;
 if(['new','vague','mastered'].includes(filter)&&db[q.id].level!==filter)return false;
 if(keyword){const s=[q.title,q.topic,q.stem,q.concept,q.motto,q.example,...q.blanks.flatMap(b=>[b.answer,...b.options.flatMap(o=>[o.name,o.reason,o.meaning])])].join(' ').toLowerCase();if(!s.includes(keyword.toLowerCase()))return false}
 return true;
}
function eligible(){
 const list=DATA.filter(matches);
 if(exam?.kind==='siblings') return exam.ids.map(id=>list.find(q=>q.id===id)).filter(Boolean);
 return list;
}
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
 $('modeLabel').textContent=mode==='all'?'全部题目':mode==='due'?'今日到期':mode==='stems'?'只看题干':exam?.kind==='siblings'?'同组辨析':exam?'自测':'逐题学习';
 const focusHint=`第 ${list.length&&currIndex>=0?currIndex+1:0} / ${list.length} 题，方向键切题，1 到 4 选择，[ ] 换空，Enter 揭晓，揭晓后 c 完成`;
 $('modeHint').textContent=mode==='focus'?(exam?`${focusHint}，可遮挡再交卷`:focusHint):`列出 ${show.length} 题`;
 $('maskBtn').hidden=!exam;$('submitBtn').hidden=!exam;
 const dockPos=currIndex<0?0:currIndex+1;
 $('prevBtn').disabled=currIndex<=0;$('nextBtn').disabled=currIndex<0||currIndex>=list.length-1;$('dockCounter').innerHTML='Q'+dockPos+' <small>/ '+list.length+'</small>';$('mobilePrev').disabled=currIndex<=0;$('mobileNext').disabled=currIndex<0||currIndex>=list.length-1;
}
function planRows(items,dateText,overflow){
 const shown=items.slice(0,SCHEDULE_PREVIEW);
 const rows=shown.map(q=>`<div class="dueitem"><a href="#${q.id}" data-link="${q.id}">${q.id} ${esc(q.title)}</a><span class="duedate">${dateText(q)}</span></div>`).join('');
 const rest=items.length-shown.length;
 return rows+(rest>0?`<p>还有 ${rest} 道。${overflow}</p>`:'');
}
function monthHTML(load){
 const heads=load.weekdays.map(dayName=>`<span>${dayName}</span>`).join('');
 const cells=load.cells.map(cell=>{
  if(!cell.inMonth)return '<div class="month-pad"></div>';
  const count=cell.count?`<b>${cell.count}</b>`:'';
  return `<div class="month-cell${cell.isToday?' is-today':''}" data-date="${cell.date}" data-count="${cell.count}"><span>${Number(cell.date.slice(8))}</span>${count}</div>`;
 }).join('');
 return `<h3>${esc(load.title)}</h3><div class="month-weekdays">${heads}</div><div class="month-grid">${cells}</div>`;
}
function renderPlan(){
 const dueItems=DATA.filter(due);const nextItems=DATA.filter(q=>!due(q)).sort((a,b)=>db[a.id].next.localeCompare(db[b.id].next));
 $('todayList').innerHTML=dueItems.length?planRows(dueItems,q=>'到期 '+esc(db[q.id].next),'用「今日到期」在目录里逐题看。'):'<p>今天没有到期的题目</p>';
 $('futureList').innerHTML=nextItems.length?planRows(nextItems,q=>esc(db[q.id].next),''):'<p class="lock">暂时没有未来复习安排</p>';
 $('monthLoad').innerHTML=monthHTML(monthLoad(day(),DATA.map(q=>db[q.id].next)));
}
function renderCompare(){
 const box=$('compareSummary');
 if(!compare){box.innerHTML='';return}
 box.innerHTML=`<div class="compare-summary"><h3>交卷对照</h3><p>${esc(tallyText(compare.tally))}</p><ol>${compare.lines.map(line=>`<li>${esc(line)}</li>`).join('')}</ol></div>`;
}
function rerender(){recalc();renderTOC();renderQuestions();renderPlan();renderCompare()}
function jump(id){
 if(!DATA.find(q=>q.id===id))return;
 if(!matches(DATA.find(q=>q.id===id))){filter='all';keyword='';$('search').value=''}
 focusId=id;mode='focus';rerender();$('questionArea').scrollIntoView({behavior:'smooth',block:'start'});
}
function changeBlank(id,index){activeBlanks[id]=index;renderQuestions()}
function toggleReveal(id){revealed.has(id)?revealed.delete(id):revealed.add(id);renderQuestions()}
function toggleBlank(id){
 const q=DATA.find(item=>item.id===id);
 if(!q||q.blanks.length<2)return;
 const index=activeBlanks[id]||0;
 const key=id+'_'+index;
 if(revealedBlanks.has(key)){revealedBlanks.delete(key);renderQuestions();return}
 const blank=q.blanks[index];
 if(blank?.options.length&&!selected[key])return;
 revealedBlanks.add(key);renderQuestions();
}
function paintGate(id){
 const btn=document.querySelector('[data-complete="'+id+'"]');
 if(!btn)return;
 const reviewed=db[id].lastReviewedOn===day();
 const ready=noted(db[id].notes);
 const blocked=reviewed||!ready;
 btn.disabled=blocked;
 if(blocked)btn.setAttribute('aria-disabled','true');else btn.removeAttribute('aria-disabled');
 btn.textContent=reviewed?'今日已复习':'今天复习完';
 const gate=document.querySelector('[data-gate="'+id+'"]');
 if(gate)gate.hidden=reviewed||ready;
}
function markLevel(id,value){db[id].level=value;db[id].last=shanghaiClock();persist();rerender();toast(id+' 已标记为 '+states[value])}
function complete(id){
 const s=db[id];
 if(s.lastReviewedOn===day()){toast('今天已经复习过这道题，明天继续更有效');return}
 if(!noted(s.notes)){toast('先留下一句自己的话，再标今天复习完');return}
 s.lastReviewedOn=day();s.count++;s.stage=Math.min(s.stage+1,6);s.next=plusDays(day(),REVIEW_INTERVALS[s.stage]);s.last=shanghaiClock();persist();rerender();toast(id+' 复习完成，下次 '+s.next);
}
function showAll(){mode='all';filter='all';keyword='';$('search').value='';rerender();$('questionArea').scrollIntoView({behavior:'smooth',block:'start'})}
function maskAll(){revealed.clear();revealedBlanks.clear();mode='stems';filter='all';keyword='';$('search').value='';rerender();$('questionArea').scrollIntoView({behavior:'smooth',block:'start'})}
function startExam(){
 revealed.clear();revealedBlanks.clear();selected={};compare=null;filter='all';keyword='';$('search').value='';focusId='Q1';mode='focus';
 exam={ids:DATA.map(q=>q.id),kind:'paper'};rerender();$('questionArea').scrollIntoView({behavior:'smooth',block:'start'});toast('先答，可遮挡，再交卷');
}
function startDrill(id){
 const ids=drillIds(DATA,id);
 if(!ids.length)return;
 revealed.clear();revealedBlanks.clear();selected={};compare=null;filter='all';keyword='';$('search').value='';focusId=id;mode='focus';
 exam={ids,kind:'siblings'};rerender();$('questionArea').scrollIntoView({behavior:'smooth',block:'start'});toast('这些题共用选项。先答，再交卷。');
}
function maskExam(){
 if(!exam)return;
 revealed.clear();revealedBlanks.clear();if(mode==='stems')mode='focus';rerender();toast('答案已遮住');
}
function submitExam(){
 if(!exam)return;
 const questions=exam.ids.map(id=>DATA.find(q=>q.id===id)).filter(Boolean);
 const notedAt=new Date().toISOString();
 for(const question of questions) noteHistory=appendNoteHistory(question.id, db[question.id].notes, notedAt);
 const at=new Date(Date.parse(notedAt)+1).toISOString();
 attemptLog=appendAttemptLog(questions.flatMap(question=>attemptEntries(question, selected, at)));
 const rows=compareRows(questions,selected);
 for(const question of questions)db[question.id].attempt=attemptOf(question,selected);
 persist();
 compare={lines:rows.map(compareLine),tally:tallyRows(rows)};
 rerender();toast('已交卷：'+tallyText(compare.tally));
}
$('startBtn').onclick=startExam;
$('maskBtn').onclick=maskExam;
$('submitBtn').onclick=submitExam;
$('dueBtn').onclick=()=>{filter='due';keyword='';$('search').value='';mode='due';rerender();$('questionArea').scrollIntoView({behavior:'smooth',block:'start'})};
$('expandBtn').onclick=showAll;$('stemBtn').onclick=maskAll;
$('search').oninput=e=>{keyword=e.target.value;mode='all';rerender()};
$('prevBtn').onclick=()=>{const arr=eligible(),i=arr.findIndex(q=>q.id===focusId);if(i>0)jump(arr[i-1].id)};$('mobilePrev').onclick=()=> $('prevBtn').click();
$('nextBtn').onclick=()=>{const arr=eligible(),i=arr.findIndex(q=>q.id===focusId);if(i<arr.length-1)jump(arr[i+1].id)};$('mobileNext').onclick=()=> $('nextBtn').click();
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(b){
 if(b.dataset.filter){filter=b.dataset.filter;mode=filter==='due'?'due':'all';rerender();return}
 if(b.dataset.jump){jump(b.dataset.jump);return}
 if(b.dataset.drill){startDrill(b.dataset.drill);return}
 if(b.dataset.reveal){toggleReveal(b.dataset.reveal);return}
 if(b.dataset.revealBlank){toggleBlank(b.dataset.revealBlank);return}
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
 if(e.target.dataset.note){const id=e.target.dataset.note;const i=+e.target.dataset.ni;db[id].notes[i]=e.target.value;persist();paintGate(id)}
 if(e.target.dataset.essay){db[e.target.dataset.essay].essay=e.target.value;persist()}
});
document.addEventListener('change',e=>{
 if(e.target.dataset?.note){const id=e.target.dataset.note;noteHistory=appendNoteHistory(id, db[id].notes, new Date().toISOString())}
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
 }else if(e.key==='['||e.key===']'){
  const q=DATA.find(x=>x.id===focusId);
  if(!q||q.blanks.length<2)return;
  e.preventDefault();
  const index=activeBlanks[q.id]||0;
  const next=e.key===']'?(index+1)%q.blanks.length:(index-1+q.blanks.length)%q.blanks.length;
  changeBlank(q.id,next);
 }else if(/^[1-4]$/.test(e.key)){
  const q=DATA.find(x=>x.id===focusId);
  if(!q)return;
  const option=getBlank(q).options[Number(e.key)-1];
  if(!option)return;
  e.preventDefault();
  selected[selectionKey(q)]=option.id;
  renderQuestions();
 }else if(e.key==='Enter'){
  e.preventDefault();
  if(focusId)toggleReveal(focusId);
 }else if(e.key==='c'){
  if(!revealed.has(focusId))return;
  e.preventDefault();
  complete(focusId);
 }
});
