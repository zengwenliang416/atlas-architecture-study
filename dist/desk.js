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

export function blankStatusText(input) {
  if (input.optionCount === 0) return '';
  if (!input.open) return input.selected ? `你选择了 ${input.selected}，答案仍遮着` : '先选择一个选项，再揭晓';
  if (!input.selected) return '答案已揭晓';
  if (input.selected === input.letter) return '回答正确';
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
