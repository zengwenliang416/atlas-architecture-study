/** DOM-neutral exam desk. Static `src/desk.js` and `dist/desk.js` are copies of this file. */
export const SCHEDULE_PREVIEW = 13;
export const ESSAY_LIMIT = 20000;
const VERDICTS = new Set(['right', 'wrong', 'skip', 'open']);

export function blankStorageKey(questionId, index) {
  return `${questionId}_${index}`;
}

export function parseAttempt(value) {
  const parts = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.length > 0
      ? value.split(',')
      : null;
  if (!parts || parts.length === 0 || parts.length > 16) return null;
  const verdicts = [];
  for (const part of parts) {
    if (!VERDICTS.has(part)) return null;
    verdicts.push(part);
  }
  return verdicts;
}

export function hasWrongBlank(attempt) {
  return Boolean(attempt?.some((item) => item === 'wrong' || item === 'skip'));
}

export function canRevealBlank(optionCount, selected, open) {
  return optionCount === 0 || Boolean(selected) || Boolean(open);
}

export function isMultiAnswer(letter) {
  return typeof letter === 'string' && /[、,，]/.test(letter);
}

function sameLetterSet(selected, letter) {
  const split = (value) => String(value).split(/[、,，]/).map((part) => part.trim()).filter(Boolean);
  const got = split(selected);
  const want = split(letter);
  if (got.length !== want.length) return false;
  const have = new Set(want);
  return got.every((item) => have.has(item));
}

export function blankStatusText(input) {
  if (input.optionCount === 0) return '';
  const multi = isMultiAnswer(input.letter);
  if (!input.open) {
    if (input.selected) return `你选择了 ${input.selected}，答案仍遮着`;
    return multi ? '先选择选项，再揭晓' : '先选择一个选项，再揭晓';
  }
  if (!input.selected) return '答案已揭晓';
  const right = multi ? sameLetterSet(input.selected, input.letter) : input.selected === input.letter;
  if (right) return '回答正确';
  return `你选择了 ${input.selected}，本空应选 ${input.letter || '概念填空'}`;
}

export function choiceClass(input) {
  return `choice${input.chosen ? ' selected' : ''}${input.open && input.correct ? ' correct-revealed' : ''}${input.open && input.chosen && !input.correct ? ' wrong-selected' : ''}`;
}

export function answersSummary(question) {
  return question.blanks
    .map((blank, index) => `第${index + 1}空：${blank.letter ? `${blank.letter} · ` : ''}${blank.answer}`)
    .join('\u3000｜\u3000');
}

export function gradeBlank(blank, selected) {
  if (!blank.options.length) return 'open';
  if (!selected) return 'skip';
  if (isMultiAnswer(blank.letter)) return sameLetterSet(selected, blank.letter) ? 'right' : 'wrong';
  return selected === blank.letter ? 'right' : 'wrong';
}

export function attemptOf(question, selected) {
  return question.blanks.map((blank, index) => gradeBlank(blank, selected[blankStorageKey(question.id, index)]));
}

export function compareRows(questions, selected) {
  const rows = [];
  for (const question of questions) {
    question.blanks.forEach((blank, index) => {
      const pick = selected[blankStorageKey(question.id, index)] || '';
      const verdict = gradeBlank(blank, pick);
      rows.push({
        questionId: question.id,
        title: question.title,
        index,
        label: blank.label || `第${index + 1}空`,
        selected: pick || '未选',
        correct: blank.letter ? `${blank.letter} · ${blank.answer}` : blank.answer,
        verdict,
      });
    });
  }
  return rows;
}

const MARK = { right: '对', wrong: '错', skip: '未答', open: '概念填空' };
const GAP = '\u3000';

export function compareLine(row) {
  return `${row.questionId} ${row.label}${GAP}选择 ${row.selected}${GAP}正确 ${row.correct}${GAP}${MARK[row.verdict]}`;
}

export function tallyRows(rows) {
  const tally = { right: 0, wrong: 0, skip: 0, open: 0 };
  for (const row of rows) tally[row.verdict] += 1;
  return tally;
}

export function tallyText(tally) {
  const base = `对 ${tally.right} · 错 ${tally.wrong} · 未答 ${tally.skip}`;
  return tally.open > 0 ? `${base} · 概念填空 ${tally.open}` : base;
}

export function hasPickedWrong(attempt) {
  return Boolean(attempt?.some((item) => item === 'wrong'));
}

export function notesChanged(previous, next) {
  if (!Array.isArray(previous) || !Array.isArray(next) || previous.length !== next.length) return false;
  return previous.some((item, index) => item !== next[index]);
}

export function hasNoteText(notes) {
  return Array.isArray(notes) && notes.some((note) => String(note ?? '').trim().length > 0);
}

/** One append-only row per blank. Skip and open store a null letter. */
export function attemptEntries(question, selected, at) {
  return question.blanks.map((blank, index) => {
    const pick = selected[blankStorageKey(question.id, index)] || '';
    const verdict = gradeBlank(blank, pick);
    const choice = verdict === 'right' || verdict === 'wrong' ? pick : null;
    return { questionId: question.id, blankIndex: index, choice, verdict, at };
  });
}

export function parseAttemptEntry(value) {
  if (!value || typeof value !== 'object') return null;
  const choice = value.choice;
  if (choice != null && typeof choice !== 'string') return null;
  if (typeof value.questionId !== 'string' || !Number.isInteger(value.blankIndex)) return null;
  if (typeof value.verdict !== 'string' || !VERDICTS.has(value.verdict)) return null;
  if (typeof value.at !== 'string') return null;
  return {
    questionId: value.questionId,
    blankIndex: value.blankIndex,
    choice: choice ?? null,
    verdict: value.verdict,
    at: value.at,
  };
}

export function parseNoteEntry(value) {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.questionId !== 'string' || typeof value.at !== 'string') return null;
  if (!Array.isArray(value.notes) || value.notes.length !== 3) return null;
  if (value.notes.some((note) => typeof note !== 'string')) return null;
  return { questionId: value.questionId, notes: value.notes.slice(), at: value.at };
}

export const LEDGER_TITLE = '错选项';

export function wrongLedger(question, entries) {
  const counts = new Map();
  for (const entry of entries) {
    if (!entry || entry.questionId !== question.id || entry.verdict !== 'wrong' || !entry.choice) continue;
    const key = `${entry.blankIndex}\u0000${entry.choice}`;
    const row = counts.get(key) ?? { blankIndex: entry.blankIndex, letter: entry.choice, count: 0 };
    row.count += 1;
    counts.set(key, row);
  }
  const rows = [];
  for (const row of counts.values()) {
    const blank = question.blanks[row.blankIndex];
    const option = blank?.options?.find((item) => item.id === row.letter);
    rows.push({
      blankIndex: row.blankIndex,
      letter: row.letter,
      count: row.count,
      label: blank?.label || `第${row.blankIndex + 1}空`,
      name: option?.name ?? '',
      meaning: option?.meaning ?? '',
      reason: option?.reason ?? '',
    });
  }
  rows.sort((left, right) => {
    if (left.blankIndex !== right.blankIndex) return left.blankIndex - right.blankIndex;
    if (left.count !== right.count) return right.count - left.count;
    if (left.letter < right.letter) return -1;
    if (left.letter > right.letter) return 1;
    return 0;
  });
  return rows;
}

export function ledgerLine(row) {
  return `${row.letter}${GAP}${row.name}${GAP}${row.count}次\n是什么：${row.meaning}\n为什么错：${row.reason}`;
}

export function optionNames(question) {
  const names = [];
  for (const blank of question.blanks) {
    for (const option of blank.options ?? []) {
      const name = String(option.name ?? '').trim();
      if (name && !names.includes(name)) names.push(name);
    }
  }
  return names;
}

/** Other questions that share at least one option name. The bank is not annotated. */
export function siblingIds(questions, questionId) {
  const self = questions.find((question) => question.id === questionId);
  if (!self) return [];
  const names = new Set(optionNames(self));
  if (names.size === 0) return [];
  const ids = [];
  for (const question of questions) {
    if (question.id === questionId) continue;
    if (optionNames(question).some((name) => names.has(name))) ids.push(question.id);
  }
  return ids;
}

export function drillIds(questions, questionId) {
  const siblings = siblingIds(questions, questionId);
  if (siblings.length === 0) return [];
  return [questionId, ...siblings];
}

const NOTE_MARKS = ['①', '②', '③'];

export function noteBody(notes) {
  if (!Array.isArray(notes)) return '';
  const parts = [];
  notes.forEach((note, index) => {
    const text = String(note ?? '').trim();
    if (text) parts.push(`${NOTE_MARKS[index] ?? ''} ${text}`.trim());
  });
  return parts.join(GAP);
}

/** Asia/Shanghai civil date from an ISO timestamp. Host timezone is not consulted. */
export function shanghaiDay(iso) {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';
  const shifted = new Date(time + 8 * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function orderedEntries(entries, questionId) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .filter((item) => item.entry && item.entry.questionId === questionId)
    .sort((left, right) => {
      if (left.entry.at < right.entry.at) return -1;
      if (left.entry.at > right.entry.at) return 1;
      return left.index - right.index;
    })
    .map((item) => item.entry);
}

export function earlierNote(history, questionId, before) {
  let found = null;
  for (const item of history) {
    if (!item || item.questionId !== questionId || !(item.at < before)) continue;
    const text = noteBody(item.notes);
    if (!text) continue;
    if (!found || item.at > found.at) found = { at: item.at, notes: item.notes, text, day: shanghaiDay(item.at) };
  }
  return found;
}

export function repeatWrongBlanks(entries, questionId) {
  const counts = new Map();
  const latest = new Map();
  for (const entry of orderedEntries(entries, questionId)) {
    latest.set(entry.blankIndex, entry);
    if (entry.verdict === 'wrong') counts.set(entry.blankIndex, (counts.get(entry.blankIndex) ?? 0) + 1);
  }
  const rows = [];
  for (const [blankIndex, entry] of latest) {
    if (entry.verdict === 'wrong' && (counts.get(blankIndex) ?? 0) >= 2) rows.push(entry);
  }
  rows.sort((left, right) => left.blankIndex - right.blankIndex);
  return rows;
}

export function confrontation(question, entries, history, blankIndex) {
  const current = repeatWrongBlanks(entries, question.id).find((entry) => entry.blankIndex === blankIndex);
  if (!current) return null;
  const note = earlierNote(history, question.id, current.at);
  if (!note) return null;
  const blank = question.blanks[blankIndex];
  if (!blank) return null;
  const correct = blank.options?.find((option) => option.id === blank.letter) ?? blank.options?.find((option) => option.correct);
  return {
    blankIndex,
    day: note.day,
    text: note.text,
    letter: blank.letter,
    reason: correct?.reason ?? '',
  };
}

export function confrontationLine(item) {
  return `${item.day} 你写下：${item.text}`;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function plusDays(iso, amount) {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new Error(`无效日期: ${iso}`);
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + amount));
  const year = next.getUTCFullYear();
  const month = String(next.getUTCMonth() + 1).padStart(2, '0');
  const day = String(next.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function weekdayMonday(iso) {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new Error(`无效日期: ${iso}`);
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return (utc.getUTCDay() + 6) % 7;
}

/**
 * Current Asia/Shanghai month. `today` is already a civil date.
 * Items due on or before today sit on today. Later items sit on their date.
 * Host timezone is not consulted.
 */
export function monthLoad(today, dueOn) {
  if (!ISO_DATE.test(today)) throw new Error(`无效日期: ${today}`);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const monthKey = today.slice(0, 7);
  const first = `${monthKey}-01`;
  const lead = weekdayMonday(first);
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const start = plusDays(first, -lead);
  const total = Math.ceil((lead + dim) / 7) * 7;
  const counts = new Map();
  for (const date of dueOn) {
    if (!ISO_DATE.test(date)) continue;
    if (date <= today) {
      if (today.startsWith(monthKey)) counts.set(today, (counts.get(today) ?? 0) + 1);
    } else if (date.startsWith(monthKey)) {
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }
  }
  const cells = [];
  for (let index = 0; index < total; index += 1) {
    const date = plusDays(start, index);
    const inMonth = date.startsWith(monthKey);
    cells.push({
      date,
      inMonth,
      count: inMonth ? counts.get(date) ?? 0 : 0,
      isToday: date === today,
    });
  }
  return { title: `${year}年${month}月`, weekdays: WEEKDAYS, cells };
}
