import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BANK_ID, DATA } from '@atlas/bank-architecture';
import {
  LEGACY_STORAGE_KEY,
  emptyRecord,
  isDue,
  matchesQuestion,
  type Level,
  type Question,
  type StudyRecord,
} from '@atlas/domain';
import { ApiError, api, signOut } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/query-keys';
import { Toast } from '../../shared/ui/toast';
import { QuestionCard } from './components/question-card';
import { initialStudyUi, studyUiReducer, type LevelFilter } from './study-reducer';

type RecordsResponse = {
  today: string;
  bankId: string;
  records: StudyRecord[];
  dueQuestionIds: string[];
};

type BankResponse = {
  bankId: string;
  etag: string;
  questions: Question[];
};

const LEVEL_LABEL: Record<Level, string> = {
  new: '新学 / 不会',
  vague: '模糊',
  mastered: '已掌握',
};
const TOC_ROW = 48;
const TOC_OVERSCAN = 4;
const SCHEDULE_PREVIEW = 13;

function TocList({
  questions,
  focusId,
  levelOf,
  onJump,
}: {
  questions: Question[];
  focusId: string;
  levelOf: (question: Question) => string;
  onJump: (id: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(320);
  const focusIndex = questions.findIndex((question) => question.id === focusId);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const measure = () => setViewport(element.clientHeight || 320);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = scroller.current;
    if (!element || focusIndex < 0) return;
    const top = focusIndex * TOC_ROW;
    const bottom = top + TOC_ROW;
    if (top < element.scrollTop) element.scrollTop = top;
    else if (bottom > element.scrollTop + element.clientHeight) element.scrollTop = Math.max(0, bottom - element.clientHeight);
  }, [focusIndex, questions.length]);

  const start = Math.max(0, Math.floor(scrollTop / TOC_ROW) - TOC_OVERSCAN);
  const end = Math.min(questions.length, Math.ceil((scrollTop + viewport) / TOC_ROW) + TOC_OVERSCAN);

  return (
    <div className="side-list" id="toc" ref={scroller} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
      {questions.length === 0 ? <div className="empty">没有匹配的题目</div> : (
        <div className="toc-spacer" style={{ height: questions.length * TOC_ROW }}>
          <div className="toc-window" style={{ transform: `translateY(${start * TOC_ROW}px)` }}>
            {questions.slice(start, end).map((question) => (
              <button type="button" key={question.id} className={`toc-item ${question.id === focusId ? 'active' : ''}`} onClick={() => onJump(question.id)}>
                <span className="toc-id">{question.id}</span>
                <span className="toc-name">{question.title}</span>
                <span className={`dot ${levelOf(question)}`}></span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function answersSummary(question: Question): string {
  return question.blanks
    .map((blank, index) => `第${index + 1}空：${blank.letter ? `${blank.letter} · ` : ''}${blank.answer}`)
    .join('　｜　');
}

export function StudyPage({ email, onSignedOut }: { email: string; onSignedOut: () => void }) {
  const queryClient = useQueryClient();
  const [ui, dispatch] = useReducer(studyUiReducer, initialStudyUi);
  const recordsQuery = useQuery({
    queryKey: queryKeys.records,
    queryFn: () => api<RecordsResponse>(`/api/study/records?bankId=${BANK_ID}`),
  });
  const bankQuery = useQuery({
    queryKey: queryKeys.bank,
    queryFn: () => api<BankResponse>('/api/banks/architecture'),
  });
  const today = recordsQuery.data?.today ?? '';
  const questions = bankQuery.data?.questions ?? DATA;
  const recordById = useMemo(() => {
    const map = new Map<string, StudyRecord>();
    for (const record of recordsQuery.data?.records ?? []) map.set(record.questionId, record);
    return map;
  }, [recordsQuery.data]);

  function recordOf(question: Question): StudyRecord {
    return recordById.get(question.id) ?? emptyRecord(question.id, today || '1970-01-01');
  }

  const visible = questions.filter((question) =>
    matchesQuestion(question, recordOf(question), { filter: ui.filter, keyword: ui.keyword, today }),
  );
  const counters = { new: 0, vague: 0, mastered: 0 };
  for (const question of questions) counters[recordOf(question).level] += 1;
  const dueCount = questions.filter((question) => isDue(recordOf(question).nextReviewOn, today)).length;
  const masteredPct = questions.length === 0 ? 0 : Math.round((counters.mastered / questions.length) * 100);
  const current = visible.find((question) => question.id === ui.focusId) ?? visible[0];
  const shown = current ? [current] : [];
  const focusId = current?.id ?? ui.focusId;
  const focusIndex = current ? visible.findIndex((question) => question.id === current.id) : -1;
  const mobileIndex = Math.max(1, questions.findIndex((question) => question.id === focusId) + 1);

  useEffect(() => {
    if (!ui.toast) return;
    const timer = window.setTimeout(() => dispatch({ type: 'toast', message: null }), 2400);
    return () => window.clearTimeout(timer);
  }, [ui.toast]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.ctrlKey || event.metaKey || event.altKey || target?.isContentEditable) return;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const next = visible[focusIndex + (event.key === 'ArrowLeft' ? -1 : 1)];
        if (next) dispatch({ type: 'jump', id: next.id, matches: true });
      } else if (/^[1-4]$/.test(event.key)) {
        const question = questions.find((item) => item.id === focusId);
        const blank = question?.blanks[(ui.activeBlanks[question.id] ?? 0)] ?? question?.blanks[0];
        const option = blank?.options[Number(event.key) - 1];
        if (question && option) {
          event.preventDefault();
          dispatch({ type: 'pick', key: `${question.id}_${ui.activeBlanks[question.id] ?? 0}`, choice: option.id });
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        dispatch({ type: 'toggle-reveal', id: focusId });
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ui.activeBlanks, visible, focusIndex, focusId, questions]);

  function toast(message: string) {
    dispatch({ type: 'toast', message });
  }

  function replaceRecord(next: StudyRecord) {
    queryClient.setQueryData<RecordsResponse>(queryKeys.records, (current) => {
      if (!current) return current;
      const records = current.records.some((record) => record.questionId === next.questionId)
        ? current.records.map((record) => (record.questionId === next.questionId ? next : record))
        : [...current.records, next];
      return { ...current, records };
    });
  }

  function onConflict(error: unknown) {
    if (error instanceof ApiError && error.status === 409) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.records });
      toast('学习记录已被其他保存更新，已重新加载');
      return;
    }
    toast(error instanceof Error ? error.message : '保存失败');
  }

  const levelMutation = useMutation({
    mutationFn: (input: { questionId: string; level: Level; version: number }) =>
      api<StudyRecord>(`/api/study/records/${input.questionId}/level?bankId=${BANK_ID}`, {
        method: 'POST',
        body: JSON.stringify({ version: input.version, level: input.level }),
      }),
    onSuccess: (record) => {
      replaceRecord(record);
      toast(`${record.questionId} 已标记为 ${LEVEL_LABEL[record.level]}`);
    },
    onError: onConflict,
  });
  const completeMutation = useMutation({
    mutationFn: (questionId: string) =>
      api<{ record: StudyRecord; idempotent: boolean }>(`/api/study/records/${questionId}/complete?bankId=${BANK_ID}`, {
        method: 'POST',
        body: '{}',
      }),
    onSuccess: (result) => {
      replaceRecord(result.record);
      toast(result.idempotent ? '今天已经复习过这道题，明天继续更有效' : `${result.record.questionId} 复习完成，下次 ${result.record.nextReviewOn}`);
    },
    onError: onConflict,
  });
  const importMutation = useMutation({
    mutationFn: (records: Record<string, unknown>) =>
      api<{ imported: number; ignored: number }>(`/api/study/import?bankId=${BANK_ID}`, {
        method: 'POST',
        body: JSON.stringify({ records }),
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.records });
      toast(`已导入 ${result.imported} 题，忽略 ${result.ignored} 条`);
    },
    onError: onConflict,
  });

  async function saveNotes(questionId: string, notes: [string, string, string], version: number) {
    try {
      const record = await api<StudyRecord>(`/api/study/records/${questionId}/notes?bankId=${BANK_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ version, notes }),
      });
      replaceRecord(record);
      return record;
    } catch (error) {
      onConflict(error);
      throw error;
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast('内容已复制');
    } catch {
      const box = document.querySelector<HTMLTextAreaElement>('#fallback');
      if (!box) return;
      box.style.display = 'block';
      box.value = text;
      box.focus();
      box.select();
      toast('请从文本框手动复制');
    }
  }

  function exportNotes(): string {
    const lines = ['系统架构设计师 · 对话题库费曼笔记', `导出日期：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`, `题目总数：${questions.length}`, '======================='];
    for (const question of questions) {
      const record = recordOf(question);
      lines.push(
        '',
        `${question.id} ${question.title}`,
        `题目：${question.stem}`,
        `答案：${answersSummary(question)}`,
        `状态：${LEVEL_LABEL[record.level]}；复习次数：${record.reviewCount}；下一次：${record.nextReviewOn}`,
        `费曼一问：${record.notes[0] || '（未填写）'}`,
        `费曼二问：${record.notes[1] || '（未填写）'}`,
        `费曼三问：${record.notes[2] || '（未填写）'}`,
        '-----------------------',
      );
    }
    return lines.join('\n');
  }

  const future = questions
    .filter((question) => !isDue(recordOf(question).nextReviewOn, today))
    .sort((a, b) => recordOf(a).nextReviewOn.localeCompare(recordOf(b).nextReviewOn))
    .slice(0, 13);
  const dueQuestions = questions.filter((question) => isDue(recordOf(question).nextReviewOn, today));
  const modeLabel = ui.mode === 'stems' ? '只看题干' : ui.filter === 'due' || ui.mode === 'due' ? '今日到期' : '逐题学习';
  const duePreview = dueQuestions.slice(0, SCHEDULE_PREVIEW);

  return (
    <div className="app" id="top">
      <header className="masthead" aria-label="复习工作台" data-specnav-shell-part="header">
        <div className="mast-brand"><span className="brandmark">a.</span><span className="brandname">Atlas</span><span className="brand-cn">系统架构设计师</span></div>
        <div className="mast-copy">
          <h1>对话题库复习</h1>
          <p>先答再揭晓，四区讲解、费曼笔记，按间隔回来</p>
        </div>
        <div className="mast-side">
          <div className="mast-actions">
            <button type="button" className="action primary" id="startBtn" onClick={() => { dispatch({ type: 'start' }); document.getElementById('questionArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); toast('先选答案，再揭晓'); }}>开始自测</button>
            <button type="button" className="text-action" id="dueBtn" onClick={() => { dispatch({ type: 'filter', filter: 'due' }); document.getElementById('questionArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>今日复习 <b id="dueNum">{dueCount}</b></button>
            <button type="button" className="text-action quiet session-chip" title={email} onClick={() => { void signOut().then(onSignedOut); }}>退出</button>
          </div>
          <p className="mast-counts">收录 <b id="totalCount">{questions.length}</b> · 已掌握 <b className="green" id="knownCount">{counters.mastered}</b> · 待巩固 <b id="vagueCount">{counters.vague}</b> · 新学 <b id="newCount">{counters.new}</b></p>
          <div className="mast-progress">
            <span id="heroPct">{masteredPct}% 已掌握</span>
            <span className="hero-progress-track"><span id="heroProgress" className="hero-progress-bar" style={{ width: `${masteredPct}%` }}></span></span>
          </div>
        </div>
      </header>
      <div className="workspace">
        <aside className={`sidebar ${ui.sidebarCollapsed ? 'collapsed' : ''}`} aria-label="题目目录" data-specnav-shell-part="sidebar">
          <div className="side-header">
            <div className="side-title">知识目录 <span>/ {visible.length}</span></div>
            <button className="mini-btn" id="toggleSidebar" type="button" aria-expanded={!ui.sidebarCollapsed} onClick={() => dispatch({ type: 'sidebar' })}>{ui.sidebarCollapsed ? '展开目录' : '收起目录'}</button>
          </div>
          <input id="search" className="search" type="search" placeholder="搜索" aria-label="搜索题目" value={ui.keyword} onChange={(event) => dispatch({ type: 'keyword', keyword: event.target.value })} />
          <div className="filterrow" id="filters">
            {(['all', 'new', 'vague', 'mastered', 'due'] as LevelFilter[]).map((filter) => (
              <button type="button" key={filter} className={`filterchip ${ui.filter === filter ? 'active' : ''}`} onClick={() => dispatch({ type: 'filter', filter })}>
                {{ all: '全部', new: '不会', vague: '模糊', mastered: '掌握', due: '今日到期' }[filter]}
              </button>
            ))}
          </div>
          <TocList questions={visible} focusId={focusId} levelOf={(question) => recordOf(question).level} onJump={(id) => dispatch({ type: 'jump', id, matches: true })} />
          <div className="side-bottom">到期复习 <strong id="sideDue">{dueCount}</strong> 道<br />今日按 Asia/Shanghai 计算</div>
        </aside>
        <main className="main" id="questionArea" data-specnav-shell-part="content">
          <div className="welcome">
            <div>
              <strong id="modeLabel">{modeLabel}</strong>
              <p id="modeHint">第 {visible.length === 0 ? 0 : focusIndex + 1} / {visible.length} 题，方向键切题，1 到 4 选择，Enter 揭晓</p>
            </div>
            <div className="mode-actions">
              <button type="button" className="text-action" id="expandBtn" onClick={() => { dispatch({ type: 'reveal-all', ids: questions.map((question) => question.id) }); document.getElementById('questionArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>全部展开</button>
              <button type="button" className="text-action" id="stemBtn" onClick={() => { dispatch({ type: 'mask-all' }); document.getElementById('questionArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>只看题干</button>
            </div>
            <div className="mini-nav">
              <button type="button" className="mini-btn" id="prevBtn" disabled={focusIndex <= 0} onClick={() => { const previous = visible[focusIndex - 1]; if (previous) dispatch({ type: 'jump', id: previous.id, matches: true }); }}>上一题</button>
              <button type="button" className="mini-btn" id="nextBtn" disabled={focusIndex < 0 || focusIndex >= visible.length - 1} onClick={() => { const next = visible[focusIndex + 1]; if (next) dispatch({ type: 'jump', id: next.id, matches: true }); }}>下一题</button>
            </div>
          </div>
          <div id="questionCards">
            {recordsQuery.isPending || bankQuery.isPending ? <div className="empty">正在读取学习记录</div> : null}
            {recordsQuery.isError || bankQuery.isError ? <div className="empty">学习记录读取失败。确认 API 已启动后刷新。</div> : null}
            {recordsQuery.isSuccess && bankQuery.isSuccess && shown.length === 0 ? <div className="empty">这个筛选下没有题目</div> : null}
            {shown.map((question) => {
              const record = recordOf(question);
              const blankIndex = ui.activeBlanks[question.id] ?? 0;
              return (
                <QuestionCard
                  key={question.id}
                  question={question}
                  record={record}
                  today={today}
                  reveal={ui.revealed.includes(question.id)}
                  blankIndex={blankIndex}
                  selectedId={ui.selected[`${question.id}_${blankIndex}`]}
                  nodeIndex={ui.nodeFocus[question.id] ?? 0}
                  essayCase={ui.activeEssayCase[question.id] ?? 'newapi'}
                  mode={ui.mode}
                  completePending={completeMutation.isPending}
                  onReveal={() => dispatch({ type: 'toggle-reveal', id: question.id })}
                  onBlank={(index) => dispatch({ type: 'blank', id: question.id, index })}
                  onPick={(choice) => dispatch({ type: 'pick', key: `${question.id}_${blankIndex}`, choice })}
                  onNode={(index) => dispatch({ type: 'node', id: question.id, index })}
                  onEssayCase={(caseKey) => dispatch({ type: 'essay', id: question.id, caseKey })}
                  onLevel={(level) => levelMutation.mutate({ questionId: question.id, level, version: record.version })}
                  onComplete={() => completeMutation.mutate(question.id)}
                  onNotes={(notes, version) => saveNotes(question.id, notes, version)}
                  onCopyEssay={(text) => { void copyText(text); }}
                />
              );
            })}
          </div>
        </main>
      </div>
      <section className="schedule" id="schedule">
        <h2>复习间隔</h2>
        <p>今天由服务器按 Asia/Shanghai 决定。新题默认今天到期；完成一轮后安排下一阶段。同一天重复完成不会再推进间隔。</p>
        <div className="interval"><span>当天</span><span>1 天</span><span>2 天</span><span>4 天</span><span>7 天</span><span>15 天</span><span>30 天</span></div>
        <div className="schedule-panel">
          <div className="duebox">
            <h3>今天应该复习</h3>
            <div id="todayList">
              {dueQuestions.length === 0 ? <p>今天没有到期的题目</p> : duePreview.map((question) => (
                <div className="dueitem" key={question.id}><a href={`#${question.id}`} onClick={(event) => { event.preventDefault(); dispatch({ type: 'jump', id: question.id, matches: matchesQuestion(question, recordOf(question), { filter: ui.filter, keyword: ui.keyword, today }) }); }}>{question.id} {question.title}</a><span className="duedate">到期 {recordOf(question).nextReviewOn}</span></div>
              ))}
              {dueQuestions.length > SCHEDULE_PREVIEW ? <p>还有 {dueQuestions.length - SCHEDULE_PREVIEW} 道。用「今日到期」在目录里逐题看。</p> : null}
            </div>
          </div>
          <div className="duebox">
            <h3>接下来的计划</h3>
            <div id="futureList">
              {future.length === 0 ? <p className="lock">暂时没有未来复习安排</p> : future.map((question) => (
                <div className="dueitem" key={question.id}><a href={`#${question.id}`} onClick={(event) => { event.preventDefault(); dispatch({ type: 'jump', id: question.id, matches: true }); }}>{question.id} {question.title}</a><span className="duedate">{recordOf(question).nextReviewOn}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="export">
        <h2>费曼笔记</h2>
        <p>费曼笔记保存在服务器。可以从本机旧的 localStorage 导入一次。</p>
        <button type="button" className="action" id="exportBtn" onClick={() => { void copyText(exportNotes()); }}>复制全部笔记</button>
        <button type="button" className="action" onClick={() => {
          const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (!raw) { toast('本机没有旧的学习记录'); return; }
          try { importMutation.mutate(JSON.parse(raw) as Record<string, unknown>); }
          catch { toast('旧记录无法解析'); }
        }}>导入本机旧记录</button>
        <textarea id="fallback" readOnly aria-label="复制失败时手动复制的笔记"></textarea>
      </section>
      <nav className="mobile-dock" aria-label="移动端题目切换">
        <button id="mobilePrev" type="button" disabled={focusIndex <= 0} onClick={() => { const previous = visible[focusIndex - 1]; if (previous) dispatch({ type: 'jump', id: previous.id, matches: true }); }}>上一题</button>
        <div className="dock-center" id="dockCounter">Q{mobileIndex} <small>/ {questions.length}</small></div>
        <button id="mobileNext" type="button" disabled={focusIndex < 0 || focusIndex >= visible.length - 1} onClick={() => { const next = visible[focusIndex + 1]; if (next) dispatch({ type: 'jump', id: next.id, matches: true }); }}>下一题</button>
      </nav>
      <button id="jumpTop" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="返回顶部">顶部</button>
      <Toast message={ui.toast} />
    </div>
  );
}
