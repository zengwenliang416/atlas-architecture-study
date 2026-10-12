import { useEffect, useMemo, useReducer } from 'react';
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
  const shown = ui.mode === 'focus'
    ? [visible.find((question) => question.id === ui.focusId) ?? visible[0]].filter((question): question is Question => Boolean(question))
    : visible;
  const focusId = ui.mode === 'focus' && shown[0] ? shown[0].id : ui.focusId;
  const focusIndex = visible.findIndex((question) => question.id === focusId);
  const mobileIndex = Math.max(1, questions.findIndex((question) => question.id === focusId) + 1);

  useEffect(() => {
    dispatch({ type: 'sidebar-set', collapsed: window.matchMedia(`(max-width:${850}px)`).matches });
  }, []);

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
      if (ui.mode !== 'focus') return;
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
  }, [ui.mode, ui.activeBlanks, visible, focusIndex, focusId, questions]);

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
  const modeLabel = ui.mode === 'all' ? '全部展开 · 逐题复习' : ui.mode === 'due' ? '今日到期 · 集中复习' : ui.mode === 'stems' ? '只看题干 · 集中自测' : '逐题学习 · 四区复习界面';

  return (
    <div className="app" id="top">
      <header className="top" aria-label="复习工作台首页" data-specnav-shell-part="header">
        <div className="hero-chrome">
          <div className="brandline"><span className="brandmark">a.</span><span>ARCH / ATLAS</span><span className="brand-divider"></span><span className="brand-cn">系统架构设计师 · 个人复习工作台</span></div>
          <div className="hero-index">
            <span>VOLUME 01 / Q01—Q39</span>
            <button type="button" className="session-chip" onClick={() => { void signOut().then(onSignedOut); }}>{email} · 退出</button>
          </div>
        </div>
        <div className="hero-content">
          <div className="hero-copy">
            <div className="hero-eyebrow">STUDY ATLAS · 知识图谱 / 记忆系统</div>
            <h1>系统架构设计师<br /><span className="hero-em">对话题库复习</span></h1>
            <p className="hero-description">从知道答案，到真正理解。39 道对话真题与知识练习，使用四区辨析、费曼讲解和间隔复习，把每个知识点变成长期记忆。</p>
            <div className="hero-inline"><span><i></i> <b>39</b> 道完整讲解</span><span><i></i> 登录后阅读解析</span><span><i></i> 学习记录以服务器为准</span></div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <svg viewBox="0 0 470 308" xmlns="http://www.w3.org/2000/svg" fill="none">
              <g stroke="#d6e1f5" strokeWidth="1"><path d="M18 52H455M18 102H455M18 152H455M18 202H455M18 252H455" /><path d="M68 20V290M118 20V290M168 20V290M218 20V290M268 20V290M318 20V290M368 20V290M418 20V290" /></g>
              <g stroke="#b2c7e9" strokeWidth="1.2"><circle cx="236" cy="155" r="124" strokeDasharray="4 7" /><circle cx="236" cy="155" r="91" /><circle cx="236" cy="155" r="55" strokeDasharray="2 8" /></g>
              <path d="M94 182L177 116L233 164L321 86L408 141" stroke="#2352b5" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M104 224L180 179L258 212L349 141L416 198" stroke="#de6557" strokeWidth="1.7" strokeLinecap="round" strokeDasharray="5 8" />
              <g fill="#fff" stroke="#2253b7" strokeWidth="2"><circle cx="94" cy="182" r="9" /><circle cx="177" cy="116" r="9" /><circle cx="233" cy="164" r="9" /><circle cx="321" cy="86" r="9" /><circle cx="408" cy="141" r="9" /></g>
              <g fill="#fff" stroke="#de6557" strokeWidth="2"><circle cx="104" cy="224" r="5" /><circle cx="180" cy="179" r="5" /><circle cx="258" cy="212" r="5" /><circle cx="349" cy="141" r="5" /><circle cx="416" cy="198" r="5" /></g>
              <rect x="201" y="130" width="69" height="48" rx="5" fill="#224eac" /><text x="235.5" y="160.5" textAnchor="middle" fill="#fff" fontFamily="Georgia" fontSize="25">4+1</text>
              <g fill="#2253b7" fontSize="10" fontFamily="Georgia" letterSpacing="1"><text x="94" y="164" textAnchor="middle">INPUT</text><text x="177" y="98" textAnchor="middle">MODEL</text><text x="319" y="66" textAnchor="middle">RECALL</text><text x="408" y="123" textAnchor="middle">RETAIN</text></g>
              <path d="M48 292H431" stroke="#19439e" strokeWidth="1.3" /><text x="48" y="284" fill="#7593c2" fontSize="11" fontFamily="Georgia" letterSpacing="3">UNDERSTAND  /  RETAIN  /  EVOLVE</text>
            </svg>
          </div>
        </div>
        <div className="hero-foot"><span><strong>ATLAS NO.01</strong>　/　把知识点变成自己的语言</span><span className="hero-progress"><span id="heroPct">{masteredPct}% 已掌握</span><span className="hero-progress-track"><span id="heroProgress" className="hero-progress-bar" style={{ width: `${masteredPct}%` }}></span></span></span></div>
      </header>
      <section className="dashboard" aria-label="学习统计">
        <div className="metric"><span>收录题目 / TOTAL</span><strong id="totalCount">{questions.length}</strong><em className="metric-kicker">01</em></div>
        <div className="metric"><span>已掌握 / MASTERED</span><strong className="green" id="knownCount">{counters.mastered}</strong><em className="metric-kicker">02</em></div>
        <div className="metric"><span>待巩固 / UNCERTAIN</span><strong id="vagueCount">{counters.vague}</strong><em className="metric-kicker">03</em></div>
        <div className="metric"><span>新学 / TO LEARN</span><strong className="red" id="newCount">{counters.new}</strong><em className="metric-kicker">04</em></div>
      </section>
      <div className="controls">
        <button type="button" className="action primary" id="startBtn" onClick={() => { dispatch({ type: 'start' }); document.getElementById('questionArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); toast('自测开始，请先选答案'); }}>开始自测 <span className="btn-arrow" aria-hidden="true">↗</span></button>
        <button type="button" className="action" id="dueBtn" onClick={() => { dispatch({ type: 'filter', filter: 'due' }); document.getElementById('questionArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>今日复习 <span className="btn-count" id="dueNum">{dueCount}</span></button>
        <button type="button" className="action" id="expandBtn" onClick={() => { dispatch({ type: 'reveal-all', ids: questions.map((question) => question.id) }); document.getElementById('questionArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>全部展开 <span aria-hidden="true">＋</span></button>
        <button type="button" className="action" id="stemBtn" onClick={() => { dispatch({ type: 'mask-all' }); document.getElementById('questionArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>只看题干 <span aria-hidden="true">◌</span></button>
        <span className="controls-label">LEARN / TEST / RECALL</span>
      </div>
      <div className="workspace">
        <aside className={`sidebar ${ui.sidebarCollapsed ? 'collapsed' : ''}`} aria-label="题目目录" data-specnav-shell-part="sidebar">
          <div className="side-header">
            <div className="side-title">知识目录 <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>/ {questions.length}</span></div>
            <button className="mini-btn" id="toggleSidebar" type="button" aria-expanded={!ui.sidebarCollapsed} onClick={() => dispatch({ type: 'sidebar' })}>{ui.sidebarCollapsed ? '展开目录 ↓' : '收起目录 ↑'}</button>
          </div>
          <input id="search" className="search" type="search" placeholder="搜索题干、知识点或选项" aria-label="搜索题目" value={ui.keyword} onChange={(event) => dispatch({ type: 'keyword', keyword: event.target.value })} />
          <div className="filterrow" id="filters">
            {(['all', 'new', 'vague', 'mastered', 'due'] as LevelFilter[]).map((filter) => (
              <button type="button" key={filter} className={`filterchip ${ui.filter === filter ? 'active' : ''}`} onClick={() => dispatch({ type: 'filter', filter })}>
                {{ all: '全部', new: '不会', vague: '模糊', mastered: '掌握', due: '今日到期' }[filter]}
              </button>
            ))}
          </div>
          <div className="side-list" id="toc">
            {visible.length === 0 ? <div className="empty">没有匹配的题目</div> : visible.map((question) => (
              <button type="button" key={question.id} className={`toc-item ${question.id === focusId ? 'active' : ''}`} onClick={() => dispatch({ type: 'jump', id: question.id, matches: true })}>
                <span className="toc-id">{question.id}</span>
                <span className="toc-name">{question.title}</span>
                <span className={`dot ${recordOf(question).level}`}></span>
              </button>
            ))}
          </div>
          <div className="side-bottom">到期复习 <strong id="sideDue">{dueCount}</strong> 道<br />今日按 Asia/Shanghai 计算</div>
        </aside>
        <main className="main" id="questionArea" data-specnav-shell-part="content">
          <div className="welcome">
            <div>
              <strong id="modeLabel">{modeLabel}</strong>
              <p id="modeHint">当前显示 {shown.length} / {questions.length} 题 · {ui.mode === 'focus' ? '点选上/下一题切换 · ←/→ 切题，数字1—4选项，Enter揭晓' : '可直接向下滚动浏览'}</p>
            </div>
            <div className="mini-nav">
              <button type="button" className="mini-btn" id="prevBtn" disabled={ui.mode !== 'focus' || focusIndex <= 0} onClick={() => { const previous = visible[focusIndex - 1]; if (previous) dispatch({ type: 'jump', id: previous.id, matches: true }); }}>← 上一题</button>
              <button type="button" className="mini-btn" id="nextBtn" disabled={ui.mode !== 'focus' || focusIndex >= visible.length - 1} onClick={() => { const next = visible[focusIndex + 1]; if (next) dispatch({ type: 'jump', id: next.id, matches: true }); }}>下一题 →</button>
            </div>
          </div>
          <div id="questionCards">
            {recordsQuery.isPending || bankQuery.isPending ? <div className="empty">正在读取学习记录</div> : null}
            {recordsQuery.isError || bankQuery.isError ? <div className="empty">学习记录读取失败。确认 API 已启动后刷新。</div> : null}
            {recordsQuery.isSuccess && bankQuery.isSuccess && shown.length === 0 ? <div className="empty">当前筛选条件下没有题目。可以切换到“全部”，或等待下一次复习。</div> : null}
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
        <h2>把遗忘，变成下一次记得</h2>
        <p>今天由服务器按 Asia/Shanghai 决定。新题默认今天到期；完成一轮后安排下一阶段。同一天重复完成不会再推进间隔。</p>
        <div className="interval"><span>当天</span><span>＋1天</span><span>＋2天</span><span>＋4天</span><span>＋7天</span><span>＋15天</span><span>＋30天</span></div>
        <div className="schedule-panel">
          <div className="duebox">
            <h3>今天应该复习</h3>
            <div id="todayList">
              {dueQuestions.length === 0 ? <p className="green">今天暂无到期题目，继续保持！</p> : dueQuestions.map((question) => (
                <div className="dueitem" key={question.id}><a href={`#${question.id}`} onClick={(event) => { event.preventDefault(); dispatch({ type: 'jump', id: question.id, matches: matchesQuestion(question, recordOf(question), { filter: ui.filter, keyword: ui.keyword, today }) }); }}>{question.id} {question.title}</a><span className="duedate">到期 {recordOf(question).nextReviewOn}</span></div>
              ))}
            </div>
          </div>
          <div className="duebox">
            <h3>接下来的计划</h3>
            <div id="futureList">
              {future.length === 0 ? <p style={{ color: 'var(--muted)' }}>暂时没有未来复习安排。</p> : future.map((question) => (
                <div className="dueitem" key={question.id}><a href={`#${question.id}`} onClick={(event) => { event.preventDefault(); dispatch({ type: 'jump', id: question.id, matches: true }); }}>{question.id} {question.title}</a><span className="duedate">{recordOf(question).nextReviewOn}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="export">
        <h2>自己的语言，才是最好的笔记</h2>
        <p>费曼笔记保存在服务器。可以从本机旧的 localStorage 导入一次。</p>
        <button type="button" className="action primary" id="exportBtn" onClick={() => { void copyText(exportNotes()); }}>复制全部费曼笔记（纯文本）</button>
        <button type="button" className="action" onClick={() => {
          const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (!raw) { toast('本机没有旧的学习记录'); return; }
          try { importMutation.mutate(JSON.parse(raw) as Record<string, unknown>); }
          catch { toast('旧记录无法解析'); }
        }}>导入本机旧记录</button>
        <textarea id="fallback" readOnly aria-label="复制失败时手动复制的笔记"></textarea>
      </section>
      <nav className="mobile-dock" aria-label="移动端题目切换">
        <button id="mobilePrev" type="button" disabled={ui.mode !== 'focus' || focusIndex <= 0} onClick={() => { const previous = visible[focusIndex - 1]; if (previous) dispatch({ type: 'jump', id: previous.id, matches: true }); }}>← 上一题</button>
        <div className="dock-center" id="dockCounter">Q{String(mobileIndex).padStart(2, '0')} <small>/ {questions.length}</small></div>
        <button id="mobileNext" type="button" disabled={ui.mode !== 'focus' || focusIndex >= visible.length - 1} onClick={() => { const next = visible[focusIndex + 1]; if (next) dispatch({ type: 'jump', id: next.id, matches: true }); }}>下一题 →</button>
      </nav>
      <button id="jumpTop" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="返回顶部">↑ 顶部</button>
      <Toast message={ui.toast} />
    </div>
  );
}
