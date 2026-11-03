import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SCHEDULE_PREVIEW,
  answersSummary,
  attemptEntries,
  attemptOf,
  blankStorageKey,
  compareLine,
  compareRows,
  confrontation,
  drillIds,
  hasPickedWrong,
  isMultiAnswer,
  monthLoad,
  siblingIds,
  tallyRows,
  tallyText,
  wrongLedger,
  type AttemptEntry,
  type NoteEntry,
} from '@atlas/desk';
import {
  LEGACY_STORAGE_KEY,
  emptyRecord,
  hasNoteText,
  isDue,
  matchesQuestion,
  notesChanged,
  type Level,
  type Question,
  type StudyRecord,
} from '@atlas/domain';
import { ApiError, api, signOut } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/query-keys';
import { Toast } from '../../shared/ui/toast';
import { STUDY_BANKS, studyBank } from './banks';
import { QuestionCard } from './components/question-card';
import { initialStudyUi, studyUiReducer, type LevelFilter } from './study-reducer';

type RecordsResponse = {
  today: string;
  bankId: string;
  records: StudyRecord[];
  dueQuestionIds: string[];
  attemptLog: AttemptEntry[];
  noteHistory: NoteEntry[];
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

export function StudyPage({ email, onSignedOut }: { email: string; onSignedOut: () => void }) {
  const queryClient = useQueryClient();
  const [bankId, setBankId] = useState(STUDY_BANKS[0].id);
  const bank = studyBank(bankId);
  const [ui, dispatch] = useReducer(studyUiReducer, initialStudyUi);
  const recordsQuery = useQuery({
    queryKey: queryKeys.records(bankId),
    queryFn: () => api<RecordsResponse>(`/api/study/records?bankId=${bankId}`),
  });
  const bankQuery = useQuery({
    queryKey: queryKeys.bank(bankId),
    queryFn: () => api<BankResponse>(`/api/banks/${bankId}`),
  });
  const today = recordsQuery.data?.today ?? '';
  const questions = bankQuery.data?.questions ?? bank.questions;
  const recordById = useMemo(() => {
    const map = new Map<string, StudyRecord>();
    for (const record of recordsQuery.data?.records ?? []) map.set(record.questionId, record);
    return map;
  }, [recordsQuery.data]);

  function recordOf(question: Question): StudyRecord {
    return recordById.get(question.id) ?? emptyRecord(question.id, today || '1970-01-01');
  }

  const attemptLog = recordsQuery.data?.attemptLog ?? [];
  const noteHistory = recordsQuery.data?.noteHistory ?? [];
  const queue = ui.exam?.kind === 'siblings'
    ? ui.exam.ids.flatMap((id) => {
        const question = questions.find((item) => item.id === id);
        return question ? [question] : [];
      })
    : questions;
  const visible = queue.filter((question) =>
    matchesQuestion(question, recordOf(question), { filter: ui.filter, keyword: ui.keyword, today }),
  );
  const counters = { new: 0, vague: 0, mastered: 0 };
  for (const question of questions) counters[recordOf(question).level] += 1;
  const dueCount = questions.filter((question) => isDue(recordOf(question).nextReviewOn, today)).length;
  const masteredPct = questions.length === 0 ? 0 : Math.round((counters.mastered / questions.length) * 100);
  const current = visible.find((question) => question.id === ui.focusId) ?? visible[0];
  const focusId = current?.id ?? ui.focusId;
  const focusIndex = current ? visible.findIndex((question) => question.id === current.id) : -1;
  const mobileIndex = visible.length === 0 || focusIndex < 0 ? 0 : focusIndex + 1;

  useEffect(() => {
    if (!ui.toast) return;
    const timer = window.setTimeout(() => dispatch({ type: 'toast', message: null }), 2400);
    return () => window.clearTimeout(timer);
  }, [ui.toast]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (ui.mode !== 'focus') return;
      if (event.ctrlKey || event.metaKey || event.altKey || target?.isContentEditable) return;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const next = visible[focusIndex + (event.key === 'ArrowLeft' ? -1 : 1)];
        if (next) dispatch({ type: 'jump', id: next.id, matches: true });
      } else if (event.key === '[' || event.key === ']') {
        if (!current || current.blanks.length < 2) return;
        event.preventDefault();
        const index = ui.activeBlanks[current.id] ?? 0;
        const next = event.key === ']' ? (index + 1) % current.blanks.length : (index - 1 + current.blanks.length) % current.blanks.length;
        dispatch({ type: 'blank', id: current.id, index: next });
      } else if (/^[1-4]$/.test(event.key)) {
        const question = questions.find((item) => item.id === focusId);
        const blank = question?.blanks[(ui.activeBlanks[question.id] ?? 0)] ?? question?.blanks[0];
        const option = blank?.options[Number(event.key) - 1];
        if (question && blank && option) {
          event.preventDefault();
          dispatch({
            type: 'pick',
            key: blankStorageKey(question.id, ui.activeBlanks[question.id] ?? 0),
            choice: option.id,
            multi: isMultiAnswer(blank.letter),
            order: blank.options.map((item) => item.id),
          });
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        dispatch({ type: 'toggle-reveal', id: focusId });
      } else if (event.key === 'c') {
        if (!ui.revealed.includes(focusId)) return;
        event.preventDefault();
        const button = document.querySelector<HTMLButtonElement>(`#${focusId} .reviewbtn`);
        if (!button || button.disabled) {
          const gate = document.querySelector(`#${focusId} .margin-rule`);
          if (gate?.textContent) dispatch({ type: 'toast', message: gate.textContent });
          else if (button?.textContent?.includes('今日已复习')) dispatch({ type: 'toast', message: '今天已经复习过这道题，明天继续更有效' });
          return;
        }
        button.click();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ui.mode, ui.activeBlanks, ui.revealed, visible, focusIndex, focusId, questions, current]);

  function toast(message: string) {
    dispatch({ type: 'toast', message });
  }

  function replaceRecord(next: StudyRecord) {
    queryClient.setQueryData<RecordsResponse>(queryKeys.records(bankId), (current) => {
      if (!current) return current;
      const records = current.records.some((record) => record.questionId === next.questionId)
        ? current.records.map((record) => (record.questionId === next.questionId ? next : record))
        : [...current.records, next];
      return { ...current, records };
    });
  }

  function onConflict(error: unknown) {
    if (error instanceof ApiError && error.status === 409) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.records(bankId) });
      toast('学习记录已被其他保存更新，已重新加载');
      return;
    }
    toast(error instanceof Error ? error.message : '保存失败');
  }

  const levelMutation = useMutation({
    mutationFn: (input: { questionId: string; level: Level; version: number }) =>
      api<StudyRecord>(`/api/study/records/${input.questionId}/level?bankId=${bankId}`, {
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
      api<{ record: StudyRecord; idempotent: boolean }>(`/api/study/records/${questionId}/complete?bankId=${bankId}`, {
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
      api<{ imported: number; ignored: number }>(`/api/study/import?bankId=${bankId}`, {
        method: 'POST',
        body: JSON.stringify({ records }),
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.records(bankId) });
      toast(`已导入 ${result.imported} 题，忽略 ${result.ignored} 条`);
    },
    onError: onConflict,
  });

  async function saveEssay(questionId: string, essayDraft: string, version: number) {
    try {
      const record = await api<StudyRecord>(`/api/study/records/${questionId}/essay?bankId=${bankId}`, {
        method: 'PATCH',
        body: JSON.stringify({ version, essayDraft }),
      });
      replaceRecord(record);
      return record;
    } catch (error) {
      onConflict(error);
      throw error;
    }
  }

  async function submitExam() {
    if (!ui.exam) return;
    const queued = ui.exam.ids
      .map((id) => questions.find((question) => question.id === id))
      .filter((question): question is Question => Boolean(question));
    const rows = compareRows(queued, ui.selected);
    const tally = tallyRows(rows);
    dispatch({ type: 'graded', compare: { lines: rows.map(compareLine), tally } });
    try {
      const stamped = new Date().toISOString();
      const result = await api<{ records: StudyRecord[]; attemptLog: AttemptEntry[] }>(`/api/study/attempts?bankId=${bankId}`, {
        method: 'POST',
        body: JSON.stringify({
          items: queued.map((question) => ({
            questionId: question.id,
            version: recordOf(question).version,
            attempt: attemptOf(question, ui.selected),
            choices: attemptEntries(question, ui.selected, stamped).map((entry) => entry.choice),
          })),
        }),
      });
      queryClient.setQueryData<RecordsResponse>(queryKeys.records(bankId), (current) => {
        if (!current) return current;
        const incoming = new Map(result.records.map((record) => [record.questionId, record]));
        const records = current.records.map((record) => incoming.get(record.questionId) ?? record);
        for (const record of result.records) {
          if (!current.records.some((item) => item.questionId === record.questionId)) records.push(record);
        }
        return { ...current, records, attemptLog: [...(current.attemptLog ?? []), ...result.attemptLog] };
      });
      toast(`已交卷：${tallyText(tally)}`);
    } catch (error) {
      onConflict(error);
    }
  }

  async function saveNotes(questionId: string, notes: [string, string, string], version: number) {
    const previous = recordById.get(questionId)?.notes ?? (['', '', ''] as [string, string, string]);
    try {
      const record = await api<StudyRecord>(`/api/study/records/${questionId}/notes?bankId=${bankId}`, {
        method: 'PATCH',
        body: JSON.stringify({ version, notes }),
      });
      replaceRecord(record);
      if (notesChanged(previous, notes) && hasNoteText(notes)) {
        const entry: NoteEntry = { questionId, notes, at: new Date().toISOString() };
        queryClient.setQueryData<RecordsResponse>(queryKeys.records(bankId), (current) => (
          current ? { ...current, noteHistory: [...(current.noteHistory ?? []), entry] } : current
        ));
      }
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
    const lines = [bank.id === 'architecture' ? '系统架构设计师 · 对话题库费曼笔记' : `${bank.name} · 费曼笔记`, `导出日期：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`, `题目总数：${questions.length}`, '======================='];
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

  const futureQuestions = questions
    .filter((question) => !isDue(recordOf(question).nextReviewOn, today))
    .sort((a, b) => recordOf(a).nextReviewOn.localeCompare(recordOf(b).nextReviewOn));
  const futurePreview = futureQuestions.slice(0, SCHEDULE_PREVIEW);
  const dueQuestions = questions.filter((question) => isDue(recordOf(question).nextReviewOn, today));
  const modeLabel = ui.mode === 'stems' ? '只看题干' : ui.mode === 'all' ? '全部题目' : ui.filter === 'due' || ui.mode === 'due' ? '今日到期' : ui.exam?.kind === 'siblings' ? '同组辨析' : ui.exam ? '自测' : '逐题学习';
  const duePreview = dueQuestions.slice(0, SCHEDULE_PREVIEW);
  const listMode = ui.mode === 'all' || ui.mode === 'due' || ui.mode === 'stems';
  const shown = listMode ? visible : current ? [current] : [];
  const focusHint = `第 ${visible.length === 0 || focusIndex < 0 ? 0 : focusIndex + 1} / ${visible.length} 题，方向键切题，1 到 4 选择，[ ] 换空，Enter 揭晓，揭晓后 c 完成`;
  const modeHint = ui.mode === 'focus' ? (ui.exam ? `${focusHint}，可遮挡再交卷` : focusHint) : `列出 ${shown.length} 题`;
  const month = today ? monthLoad(today, questions.map((question) => recordOf(question).nextReviewOn)) : null;

  return (
    <div className="app" id="top">
      <header className="masthead" aria-label="复习工作台" data-specnav-shell-part="header">
        <div className="mast-brand">
          <span className="brandmark">a.</span>
          <span className="brandname">Atlas</span>
          <span className="bankrow">
            {STUDY_BANKS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`filterchip ${item.id === bankId ? 'active' : ''}`}
                aria-pressed={item.id === bankId}
                onClick={() => {
                  if (item.id === bankId) return;
                  setBankId(item.id);
                  dispatch({
                    type: 'switch-bank',
                    focusId: item.questions[0]?.id ?? 'Q1',
                    activeBlanks: item.id === 'architecture' ? { Q9: 2 } : {},
                  });
                }}
              >{item.name}</button>
            ))}
          </span>
        </div>
        <div className="mast-copy">
          <h1>对话题库复习</h1>
          <p>{bank.lead}</p>
        </div>
        <div className="mast-side">
          <div className="mast-actions">
            <button type="button" className="action primary" id="startBtn" onClick={() => { dispatch({ type: 'start', ids: questions.map((question) => question.id) }); document.getElementById('questionArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); toast('先答，可遮挡，再交卷'); }}>开始自测</button>
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
            {(['all', 'new', 'vague', 'mastered', 'due', 'wrong'] as LevelFilter[]).map((filter) => (
              <button type="button" key={filter} className={`filterchip ${ui.filter === filter ? 'active' : ''}`} onClick={() => dispatch({ type: 'filter', filter })}>
                {{ all: '全部', new: '不会', vague: '模糊', mastered: '掌握', due: '今日到期', wrong: '错题' }[filter]}
              </button>
            ))}
          </div>
          <TocList questions={visible} focusId={focusId} levelOf={(question) => recordOf(question).level} onJump={(id) => dispatch({ type: 'jump', id, matches: true })} />
          <div className="side-bottom">到期复习 <strong id="sideDue">{dueCount}</strong> 道<br />学习记录在服务器</div>
        </aside>
        <main className="main" id="questionArea" data-specnav-shell-part="content">
          <div className="welcome">
            <div>
              <strong id="modeLabel">{modeLabel}</strong>
              <p id="modeHint">{modeHint}</p>
            </div>
            <div className="mode-actions">
              <button type="button" className="text-action" id="expandBtn" onClick={() => { dispatch({ type: 'expand-all' }); document.getElementById('questionArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>全部题目</button>
              <button type="button" className="text-action" id="stemBtn" onClick={() => { dispatch({ type: 'mask-all' }); document.getElementById('questionArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>只看题干</button>
              {ui.exam ? <button type="button" className="text-action" id="maskBtn" onClick={() => { dispatch({ type: 'mask-exam' }); toast('答案已遮住'); }}>遮挡</button> : null}
              {ui.exam ? <button type="button" className="text-action" id="submitBtn" onClick={() => { void submitExam(); }}>交卷</button> : null}
            </div>
            <div className="mini-nav">
              <button type="button" className="mini-btn" id="prevBtn" disabled={focusIndex <= 0} onClick={() => { const previous = visible[focusIndex - 1]; if (previous) dispatch({ type: 'jump', id: previous.id, matches: true }); }}>上一题</button>
              <button type="button" className="mini-btn" id="nextBtn" disabled={focusIndex < 0 || focusIndex >= visible.length - 1} onClick={() => { const next = visible[focusIndex + 1]; if (next) dispatch({ type: 'jump', id: next.id, matches: true }); }}>下一题</button>
            </div>
          </div>
          <div id="compareSummary">
            {ui.compare ? (
              <div className="compare-summary">
                <h3>交卷对照</h3>
                <p>{tallyText(ui.compare.tally)}</p>
                <ol>{ui.compare.lines.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ol>
              </div>
            ) : null}
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
                  openBlanks={question.blanks.map((_, index) => ui.revealed.includes(question.id) || ui.revealedBlanks.includes(blankStorageKey(question.id, index)))}
                  blankIndex={blankIndex}
                  selectedId={ui.selected[blankStorageKey(question.id, blankIndex)]}
                  nodeIndex={ui.nodeFocus[question.id] ?? 0}
                  essayCase={ui.activeEssayCase[question.id] ?? 'newapi'}
                  mode={ui.mode}
                  completePending={completeMutation.isPending}
                  onReveal={() => dispatch({ type: 'toggle-reveal', id: question.id })}
                  onRevealBlank={() => dispatch({ type: 'toggle-blank-reveal', id: question.id, index: blankIndex })}
                  onBlank={(index) => dispatch({ type: 'blank', id: question.id, index })}
                  onPick={(choice) => {
                    const blank = question.blanks[blankIndex] ?? question.blanks[0];
                    dispatch({
                      type: 'pick',
                      key: blankStorageKey(question.id, blankIndex),
                      choice,
                      multi: isMultiAnswer(blank?.letter ?? ''),
                      order: blank?.options.map((option) => option.id),
                    });
                  }}
                  onNode={(index) => dispatch({ type: 'node', id: question.id, index })}
                  onEssayCase={(caseKey) => dispatch({ type: 'essay', id: question.id, caseKey })}
                  onLevel={(level) => levelMutation.mutate({ questionId: question.id, level, version: record.version })}
                  onComplete={() => completeMutation.mutate(question.id)}
                  onNotes={(notes, version) => saveNotes(question.id, notes, version)}
                  onEssayDraft={(essayDraft, version) => saveEssay(question.id, essayDraft, version)}
                  onCopyEssay={(text) => { void copyText(text); }}
                  ledger={wrongLedger(question, attemptLog).filter((row) => row.blankIndex === blankIndex)}
                  priorNote={confrontation(question, attemptLog, noteHistory, blankIndex)}
                  drill={hasPickedWrong(record.attempt) && siblingIds(questions, question.id).length > 0}
                  onDrill={() => {
                    const ids = drillIds(questions, question.id);
                    if (ids.length === 0) return;
                    dispatch({ type: 'start', ids, kind: 'siblings' });
                    document.getElementById('questionArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    toast('这些题共用选项。先答，再交卷。');
                  }}
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
        {month ? (
          <div id="monthLoad" className="month-load">
            <h3>{month.title}</h3>
            <div className="month-weekdays">{month.weekdays.map((day) => <span key={day}>{day}</span>)}</div>
            <div className="month-grid">
              {month.cells.map((cell) => cell.inMonth ? (
                <div key={cell.date} className={`month-cell${cell.isToday ? ' is-today' : ''}`} data-date={cell.date} data-count={cell.count}>
                  <span>{Number(cell.date.slice(8))}</span>
                  {cell.count > 0 ? <b>{cell.count}</b> : null}
                </div>
              ) : <div key={cell.date} className="month-pad" />)}
            </div>
          </div>
        ) : null}
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
              {futureQuestions.length === 0 ? <p className="lock">暂时没有未来复习安排</p> : futurePreview.map((question) => (
                <div className="dueitem" key={question.id}><a href={`#${question.id}`} onClick={(event) => { event.preventDefault(); dispatch({ type: 'jump', id: question.id, matches: true }); }}>{question.id} {question.title}</a><span className="duedate">{recordOf(question).nextReviewOn}</span></div>
              ))}
              {futureQuestions.length > SCHEDULE_PREVIEW ? <p>还有 {futureQuestions.length - SCHEDULE_PREVIEW} 道。</p> : null}
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
        <div className="dock-center" id="dockCounter">Q{mobileIndex} <small>/ {visible.length}</small></div>
        <button id="mobileNext" type="button" disabled={focusIndex < 0 || focusIndex >= visible.length - 1} onClick={() => { const next = visible[focusIndex + 1]; if (next) dispatch({ type: 'jump', id: next.id, matches: true }); }}>下一题</button>
      </nav>
      <button id="jumpTop" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="返回顶部">顶部</button>
      <Toast message={ui.toast} />
    </div>
  );
}
