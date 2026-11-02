import type { PaperQuestion } from '@atlas/desk';

export type StudyMode = 'focus' | 'all' | 'due' | 'stems' | 'memorize';
export type LevelFilter = 'all' | 'new' | 'vague' | 'mastered' | 'due' | 'wrong' | 'unmemorized';
export type PaperFilter = 'all' | 'wrong' | 'skip';

export type CompareView = {
  questions: PaperQuestion[];
  tally: { right: number; wrong: number; skip: number; open: number };
};

export type ExamQueue = {
  ids: string[];
  kind: 'paper' | 'siblings';
};

export type StudyUiState = {
  mode: StudyMode;
  focusId: string;
  filter: LevelFilter;
  topic: string;
  paperFilter: PaperFilter;
  keyword: string;
  revealed: string[];
  revealedBlanks: string[];
  activeBlanks: Record<string, number>;
  selected: Record<string, string>;
  nodeFocus: Record<string, number>;
  activeEssayCase: Record<string, string>;
  sidebarCollapsed: boolean;
  toast: string | null;
  exam: ExamQueue | null;
  compare: CompareView | null;
};

export type StudyUiAction =
  | { type: 'toast'; message: string | null }
  | { type: 'mode'; mode: StudyMode }
  | { type: 'filter'; filter: LevelFilter }
  | { type: 'topic'; topic: string }
  | { type: 'paper-filter'; filter: PaperFilter }
  | { type: 'keyword'; keyword: string }
  | { type: 'focus'; id: string }
  | { type: 'toggle-reveal'; id: string }
  | { type: 'toggle-blank-reveal'; id: string; index: number }
  | { type: 'expand-all' }
  | { type: 'mask-all' }
  | { type: 'blank'; id: string; index: number }
  | { type: 'pick'; key: string; choice: string; multi?: boolean; order?: string[] }
  | { type: 'switch-bank'; focusId: string; activeBlanks: Record<string, number> }
  | { type: 'node'; id: string; index: number }
  | { type: 'essay'; id: string; caseKey: string }
  | { type: 'sidebar' }
  | { type: 'sidebar-set'; collapsed: boolean }
  | { type: 'start'; ids: string[]; kind?: ExamQueue['kind'] }
  | { type: 'mask-exam' }
  | { type: 'graded'; compare: CompareView }
  | { type: 'jump'; id: string; matches: boolean };

export const initialStudyUi: StudyUiState = {
  mode: 'focus',
  focusId: 'Q1',
  filter: 'all',
  topic: '',
  paperFilter: 'all',
  keyword: '',
  revealed: [],
  revealedBlanks: [],
  activeBlanks: { Q9: 2 },
  selected: {},
  nodeFocus: {},
  activeEssayCase: {},
  sidebarCollapsed: false,
  toast: null,
  exam: null,
  compare: null,
};

export function studyUiReducer(state: StudyUiState, action: StudyUiAction): StudyUiState {
  switch (action.type) {
    case 'toast':
      return { ...state, toast: action.message };
    case 'mode':
      if (action.mode === 'memorize') {
        return { ...state, mode: 'memorize', exam: null, compare: null, filter: 'all', keyword: '', topic: '', paperFilter: 'all' };
      }
      return { ...state, mode: action.mode };
    case 'filter':
      if (state.mode === 'memorize') return { ...state, filter: action.filter };
      return { ...state, filter: action.filter, mode: action.filter === 'due' ? 'due' : 'all' };
    case 'topic':
      return { ...state, topic: action.topic };
    case 'paper-filter':
      return { ...state, paperFilter: action.filter };
    case 'keyword':
      if (state.mode === 'memorize') return { ...state, keyword: action.keyword };
      return { ...state, keyword: action.keyword, mode: 'all' };
    case 'focus':
      return { ...state, focusId: action.id, mode: 'focus' };
    case 'toggle-reveal': {
      const revealed = state.revealed.includes(action.id)
        ? state.revealed.filter((id) => id !== action.id)
        : [...state.revealed, action.id];
      return { ...state, revealed };
    }
    case 'toggle-blank-reveal': {
      const key = `${action.id}_${action.index}`;
      const revealedBlanks = state.revealedBlanks.includes(key)
        ? state.revealedBlanks.filter((item) => item !== key)
        : [...state.revealedBlanks, key];
      return { ...state, revealedBlanks };
    }
    case 'expand-all':
      return { ...state, mode: 'all', filter: 'all', keyword: '' };
    case 'mask-all':
      return { ...state, revealed: [], revealedBlanks: [], mode: 'stems', filter: 'all', keyword: '' };
    case 'blank':
      return { ...state, activeBlanks: { ...state.activeBlanks, [action.id]: action.index } };
    case 'pick': {
      if (!action.multi) return { ...state, selected: { ...state.selected, [action.key]: action.choice } };
      const have = new Set((state.selected[action.key] ?? '').split('、').filter(Boolean));
      if (have.has(action.choice)) have.delete(action.choice);
      else have.add(action.choice);
      const order = action.order ?? [...have].sort();
      return { ...state, selected: { ...state.selected, [action.key]: order.filter((id) => have.has(id)).join('、') } };
    }
    case 'switch-bank':
      return {
        ...initialStudyUi,
        focusId: action.focusId,
        activeBlanks: action.activeBlanks,
        sidebarCollapsed: state.sidebarCollapsed,
      };
    case 'node':
      return { ...state, nodeFocus: { ...state.nodeFocus, [action.id]: action.index } };
    case 'essay':
      return { ...state, activeEssayCase: { ...state.activeEssayCase, [action.id]: action.caseKey } };
    case 'sidebar':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'sidebar-set':
      return { ...state, sidebarCollapsed: action.collapsed };
    case 'mask-exam':
      if (!state.exam) return state;
      return { ...state, revealed: [], revealedBlanks: [], mode: 'focus' };
    case 'graded':
      return { ...state, compare: action.compare, paperFilter: 'all' };
    case 'start':
      return {
        ...state,
        revealed: [],
        revealedBlanks: [],
        selected: {},
        filter: 'all',
        keyword: '',
        focusId: action.ids[0] ?? 'Q1',
        mode: 'focus',
        exam: { ids: action.ids, kind: action.kind ?? 'paper' },
        compare: null,
        paperFilter: 'all',
      };
    case 'jump':
      if (state.mode === 'memorize' && action.matches) return { ...state, focusId: action.id };
      return action.matches
        ? { ...state, focusId: action.id, mode: 'focus' }
        : { ...state, focusId: action.id, mode: 'focus', filter: 'all', keyword: '' };
    default:
      return state;
  }
}
