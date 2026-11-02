export const SCHEDULE_PREVIEW: 13;
export const ESSAY_LIMIT: 20000;

export type BlankVerdict = 'right' | 'wrong' | 'skip' | 'open';

export type DeskOption = {
  id: string;
  name?: string;
  meaning?: string;
  reason?: string;
  correct?: boolean;
};

export type DeskBlank = {
  label: string;
  answer: string;
  letter: string;
  options: readonly DeskOption[];
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

export type AttemptEntry = {
  questionId: string;
  blankIndex: number;
  choice: string | null;
  verdict: BlankVerdict;
  at: string;
};

export type NoteEntry = {
  questionId: string;
  notes: readonly string[];
  at: string;
};

export type LedgerRow = {
  blankIndex: number;
  letter: string;
  count: number;
  label: string;
  name: string;
  meaning: string;
  reason: string;
};

export type EarlierNote = {
  at: string;
  notes: readonly string[];
  text: string;
  day: string;
};

export type Confrontation = {
  blankIndex: number;
  day: string;
  text: string;
  letter: string;
  reason: string;
};

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
export function hasPickedWrong(attempt: readonly string[] | null | undefined): boolean;
export function notesChanged(previous: readonly string[], next: readonly string[]): boolean;
export function hasNoteText(notes: readonly string[]): boolean;
export function attemptEntries(
  question: DeskQuestion,
  selected: Readonly<Record<string, string>>,
  at: string,
): AttemptEntry[];
export function parseAttemptEntry(value: unknown): AttemptEntry | null;
export function parseNoteEntry(value: unknown): NoteEntry | null;
export const LEDGER_TITLE: '错选项';
export function wrongLedger(question: DeskQuestion, entries: readonly AttemptEntry[]): LedgerRow[];
export function ledgerLine(row: LedgerRow): string;
export function optionNames(question: DeskQuestion): string[];
export function siblingIds(questions: readonly DeskQuestion[], questionId: string): string[];
export function drillIds(questions: readonly DeskQuestion[], questionId: string): string[];
export function noteBody(notes: readonly string[]): string;
export function shanghaiDay(iso: string): string;
export function earlierNote(history: readonly NoteEntry[], questionId: string, before: string): EarlierNote | null;
export function repeatWrongBlanks(entries: readonly AttemptEntry[], questionId: string): AttemptEntry[];
export function confrontation(
  question: DeskQuestion,
  entries: readonly AttemptEntry[],
  history: readonly NoteEntry[],
  blankIndex: number,
): Confrontation | null;
export function confrontationLine(item: Pick<Confrontation, 'day' | 'text'>): string;
export function monthLoad(today: string, dueOn: readonly string[]): MonthLoad;
