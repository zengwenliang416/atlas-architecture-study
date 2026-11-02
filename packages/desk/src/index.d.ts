export const SCHEDULE_PREVIEW: 13;
export const ESSAY_LIMIT: 20000;

export type BlankVerdict = 'right' | 'wrong' | 'skip' | 'open';

export type DeskBlank = {
  label: string;
  answer: string;
  letter: string;
  options: readonly { id: string }[];
};

export type DeskQuestion = {
  id: string;
  title: string;
  blanks: readonly DeskBlank[];
};

export type CompareRow = {
  questionId: string;
  title: string;
  index: number;
  label: string;
  selected: string;
  correct: string;
  verdict: BlankVerdict;
};

export type Tally = { right: number; wrong: number; skip: number; open: number };

export type MonthCell = {
  date: string;
  inMonth: boolean;
  count: number;
  isToday: boolean;
};

export type MonthLoad = {
  title: string;
  weekdays: readonly string[];
  cells: readonly MonthCell[];
};

export function blankStorageKey(questionId: string, index: number): string;
export function parseAttempt(value: unknown): BlankVerdict[] | null;
export function hasWrongBlank(attempt: readonly string[] | null | undefined): boolean;
export function isMultiAnswer(letter: string): boolean;
export function canRevealBlank(optionCount: number, selected: string | undefined, open: boolean): boolean;
export function blankStatusText(input: {
  optionCount: number;
  selected?: string;
  letter: string;
  open: boolean;
}): string;
export function choiceClass(input: { chosen: boolean; open: boolean; correct: boolean }): string;
export function answersSummary(question: { blanks: readonly DeskBlank[] }): string;
export function gradeBlank(blank: DeskBlank, selected: string | undefined): BlankVerdict;
export function attemptOf(question: DeskQuestion, selected: Readonly<Record<string, string>>): BlankVerdict[];
export function compareRows(questions: readonly DeskQuestion[], selected: Readonly<Record<string, string>>): CompareRow[];
export function compareLine(row: CompareRow): string;
export function tallyRows(rows: readonly CompareRow[]): Tally;
export function tallyText(tally: Tally): string;
export function monthLoad(today: string, dueOn: readonly string[]): MonthLoad;
