import { useEffect, useRef, useState } from 'react';
import type { Level, Question, StudyRecord } from '@atlas/domain';

const LEVEL_BUTTONS: [Level, string][] = [
  ['new', '新学/不会'],
  ['vague', '模糊'],
  ['mastered', '已掌握'],
];
const NOTE_LABELS = ['① 我怎么讲给零基础同学听？', '② 我卡在哪个步骤或选项？', '③ 如果只留一句，我记住什么？'];

function formatMarked(iso: string | null): string {
  if (!iso) return '未标记';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function QuestionCard({
  question,
  record,
  today,
  reveal,
  blankIndex,
  selectedId,
  nodeIndex,
  essayCase,
  mode,
  completePending,
  onReveal,
  onBlank,
  onPick,
  onNode,
  onEssayCase,
  onLevel,
  onComplete,
  onNotes,
  onCopyEssay,
}: {
  question: Question;
  record: StudyRecord;
  today: string;
  reveal: boolean;
  blankIndex: number;
  selectedId?: string;
  nodeIndex: number;
  essayCase: string;
  mode: string;
  completePending: boolean;
  onReveal: () => void;
  onBlank: (index: number) => void;
  onPick: (choiceId: string) => void;
  onNode: (index: number) => void;
  onEssayCase: (caseKey: string) => void;
  onLevel: (level: Level) => void;
  onComplete: () => void;
  onNotes: (notes: [string, string, string], version: number) => Promise<StudyRecord>;
  onCopyEssay: (text: string) => void;
}) {
  const blank = question.blanks[blankIndex] ?? question.blanks[0];
  const [notes, setNotes] = useState<[string, string, string]>(record.notes);
  const version = useRef(record.version);
  const dirty = useRef(false);
  const flight = useRef<Promise<void> | null>(null);
  const focused = useRef(false);

  useEffect(() => {
    version.current = record.version;
    if (!dirty.current && !focused.current) setNotes(record.notes);
  }, [record]);

  useEffect(() => {
    if (!dirty.current) return;
    const timer = window.setTimeout(() => {
      void flush();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [notes]);

  async function flush() {
    if (!dirty.current) return;
    if (flight.current) return flight.current;
    const payload = notes;
    const expected = version.current;
    const run = (async () => {
      const next = await onNotes(payload, expected);
      version.current = next.version;
      dirty.current = false;
    })().finally(() => {
      flight.current = null;
    });
    flight.current = run;
    await run;
    if (dirty.current) await flush();
  }

  if (!blank) return null;
  const correct = Boolean(selectedId) && selectedId === blank.letter;
  const open = blank.options.length === 0;
  let response = open ? '' : '先选择一个选项，再揭晓';
  if (selectedId && !reveal) response = `你选择了 ${selectedId}，答案仍遮着`;
  if (reveal) {
    response = selectedId
      ? correct
        ? '回答正确'
        : `你选择了 ${selectedId}，本空应选 ${blank.letter || '概念填空'}`
      : '答案已揭晓';
  }
  const step = question.steps[Math.min(question.steps.length - 1, nodeIndex)] ?? question.steps[0];
  const doneToday = record.lastReviewedOn === today;
  const summary = question.blanks
    .map((item, index) => `第${index + 1}空：${item.letter ? `${item.letter} · ` : ''}${item.answer}`)
    .join('　｜　');

  return (
    <article className={`q-shell ${reveal ? '' : 'only-masked'} ${mode === 'stems' && !reveal ? 'stem-only' : ''}`} id={question.id}>
      <div className="q-heading">
        <div>
          <h2>
            <span className="q-id">{question.id}</span>
            {question.title}
          </h2>
          <div className="meta-line">{question.kind}　/　{question.topic}　·　{question.blanks.length}个填空/设问</div>
        </div>
        <div className="q-actions">
          <button type="button" className="small-btn reveal" aria-expanded={reveal} onClick={onReveal}>{reveal ? '再次遮挡' : '揭晓答案'}</button>
          <button type="button" className="small-btn" onClick={() => document.getElementById(`feynman-${question.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>费曼三问</button>
        </div>
      </div>
      <div className="zones">
        <section className="paper">
          <h3><span className="num">①</span>{reveal ? '题目识别 / 正确答案' : '题目识别'}</h3>
          <span className="pill">{question.topic} · {question.kind}</span>
          <div className="stem">{question.stem}</div>
          {question.blanks.length > 1 ? (
            <div className="blanks">
              {question.blanks.map((item, index) => (
                <button type="button" key={item.label} className={`blanktab ${blankIndex === index ? 'active' : ''}`} onClick={() => onBlank(index)}>{item.label}</button>
              ))}
            </div>
          ) : null}
          {blank.options.length === 0 ? (
            <div className="preclose">这一空的原始A/B/C/D选项未出现在对话中。<br />先写出术语，再揭晓</div>
          ) : (
            <div className="option-list">
              {blank.options.map((option) => {
                const chosen = selectedId === option.id;
                const className = `choice${chosen ? ' selected' : ''}${reveal && option.correct ? ' correct-revealed' : ''}${reveal && chosen && !option.correct ? ' wrong-selected' : ''}`;
                return (
                  <button type="button" key={option.id} className={className} aria-pressed={chosen} onClick={() => onPick(option.id)}>
                    <span className="letter">{option.id}</span>
                    <span>{option.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          {question.blanks.length > 1 ? (
            <div className="blank-answer-list">
              <b>各空答案：</b>
              {question.blanks.map((item, index) => (
                <div key={item.label}>
                  <span>{item.label || `第${index + 1}空`}</span>
                  <strong>{item.letter ? `${item.letter} · ` : ''}{item.answer}</strong>
                  {item.options.length === 0 ? <em>（原题未提供选项）</em> : null}
                </div>
              ))}
            </div>
          ) : null}
          {response ? <div className="response" role="status">{response}</div> : null}
          <div className={`answer ${reveal ? '' : 'hidden'}`}>
            答案：{blank.letter || '原题未给字母'} · {blank.answer}
            {question.blanks.length > 1 ? <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>全题：{summary}</div> : null}
          </div>
          {reveal ? null : <div className="lock">答案和解析先遮着</div>}
        </section>
        <section className="paper">
          <h3><span className="num">②</span>概念</h3>
          <div className="concept-wrap">
            <div className="concept-intro">{question.concept}</div>
            <div className="diagram" aria-label="可点击的知识概念流程图">
              {question.steps.map((item, index) => (
                <span key={item[0]}>
                  {index > 0 ? <span className="arrow" aria-hidden="true">→</span> : null}
                  <button type="button" className={`node ${nodeIndex === index ? 'on' : ''}`} aria-pressed={nodeIndex === index} onClick={() => onNode(index)}>{item[0]}</button>
                </span>
              ))}
            </div>
            {step ? <div className="node-desc"><b>{step[0]}：</b>{step[1]}</div> : null}
            <div className="concept-takeaway">
              <div className="concept-takeaway-title">关键记忆</div>
              <ul>{question.summary.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </section>
        <section className="paper middle revealed-only">
          <h3><span className="num">③</span>四个选项逐项解析 <span className="pill">是什么 · 对错 · 为什么</span></h3>
          <div className="option-grid">
            {blank.options.length === 0 ? (
              <article className="opdetail">
                <h4>本空为概念填空</h4>
                <p>原始独立选项未展示，不能推定正确选项字母。</p>
                <p><b>标准术语：</b><span className="red">{blank.answer}</span></p>
              </article>
            ) : blank.options.map((option) => (
              <article key={option.id} className={`opdetail ${option.correct ? 'correct' : ''}`}>
                <h4>{option.id}. {option.name}</h4>
                <p><strong className="verdict">{option.correct ? '正确' : '不选'}</strong></p>
                <p><b>是什么：</b>{option.meaning}</p>
                <p><b>为什么{option.correct ? '对' : '错'}：</b>{option.reason}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="paper lower revealed-only">
          <h3><span className="num">④</span>总结、例子、易错点与口诀</h3>
          <div className="takeaway-grid">
            <div>
              <div className="bluelabel">④ 核心知识点</div>
              <ul className="explain-list">{question.core.map((item) => <li key={item}>{item}</li>)}</ul>
              <div className="bluelabel">⑤ 小白例子</div>
              <p className="summaryline">{question.example}</p>
            </div>
            <div>
              <div className="bluelabel">⑥ 易错点</div>
              <ul className="explain-list">{question.pitfalls.map((item) => <li key={item}>{item}</li>)}</ul>
              <div className="bluelabel">⑧ 图示：互动文字还原</div>
              <ul className="explain-list">{question.summary.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
          <div className="mnemonic">记忆口诀：{question.motto}</div>
          {question.essay_cases ? (
            <div className="essay-full" id={`essay-${question.id}`}>
              <div className="essay-header">
                <div>
                  <h3>完整论文参考范文 · {essayCase === 'ecommerce' ? '电商交易平台' : 'New API 企业级 AI 网关'}</h3>
                  <p>两篇均为教学示例；可切换阅读并复制，项目经历与量化数据应由本人真实事实替换。</p>
                </div>
                <div className="essay-tabs">
                  <button type="button" className={`small-btn ${essayCase === 'newapi' ? 'essay-selected' : ''}`} data-essaycase={question.id} onClick={() => onEssayCase('newapi')}>New API 网关</button>
                  <button type="button" className={`small-btn ${essayCase === 'ecommerce' ? 'essay-selected' : ''}`} data-essaycase={question.id} onClick={() => onEssayCase('ecommerce')}>电商平台</button>
                </div>
              </div>
              <div className="essay-copybar">
                <span>{question.id} · {question.title}</span>
                <button type="button" className="small-btn" onClick={() => {
                  const sections = question.essay_cases?.[essayCase] ?? [];
                  const caseName = essayCase === 'ecommerce' ? '电商交易平台' : 'New API 企业级 AI 网关';
                  onCopyEssay(`${question.id} ${question.title}\n${caseName}\n\n${sections.map((section) => `${section[0]}\n${section[1]}`).join('\n\n')}`);
                }}>复制本文</button>
              </div>
              <div className="essay-body">
                {(question.essay_cases[essayCase] ?? []).map((section) => (
                  <section key={section[0]}><h4>{section[0]}</h4><p>{section[1]}</p></section>
                ))}
              </div>
            </div>
          ) : null}
          <div className="source"><b>⑦ 资料依据：</b>{question.source}</div>
        </section>
      </div>
      <section className="feynman" id={`feynman-${question.id}`}>
        <h3>费曼三问</h3>
        <p>写下来就会保存。讲得越像给零基础同学解释，掌握得越稳。</p>
        <div className="feynman-grid">
          {NOTE_LABELS.map((label, index) => (
            <div className="fyn" key={label}>
              <label htmlFor={`fyn-${question.id}-${index}`}>{label}</label>
              <textarea
                id={`fyn-${question.id}-${index}`}
                value={notes[index]}
                placeholder="用自己的话写"
                onFocus={() => { focused.current = true; }}
                onBlur={() => { focused.current = false; void flush(); }}
                onChange={(event) => {
                  const next = [...notes] as [string, string, string];
                  next[index] = event.target.value;
                  dirty.current = true;
                  setNotes(next);
                }}
              />
            </div>
          ))}
        </div>
      </section>
      <div className="statusbar">
        <div className="state-group">
          <span className="recordline" style={{ paddingTop: 9 }}>掌握程度：</span>
          {LEVEL_BUTTONS.map(([value, label]) => (
            <button type="button" key={value} className={`state-btn ${record.level === value ? `active ${value}` : ''}`} aria-pressed={record.level === value} onClick={() => onLevel(value)}>{label}</button>
          ))}
        </div>
        <div className="recordline">上次标记：{formatMarked(record.lastMarkedAt)}<br />下一次复习：<b>{record.nextReviewOn}</b>　已复习：{record.reviewCount}次</div>
        <button type="button" className="reviewbtn" disabled={doneToday || completePending} aria-disabled={doneToday || completePending} onClick={onComplete}>
          {doneToday ? '今日已复习' : '今天复习完'}
        </button>
      </div>
    </article>
  );
}
