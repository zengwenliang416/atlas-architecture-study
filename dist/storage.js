/** Local-first study repository (Repository + defensive normalization). */
import { ESSAY_LIMIT, hasNoteText, notesChanged, parseAttempt, parseAttemptEntry, parseNoteEntry } from './desk.js';

export const STORAGE_KEY = 'architecture_review_focused_notes_v2';
export const ATTEMPT_LOG_KEY = 'architecture_review_attempt_log_v1';
export const NOTE_HISTORY_KEY = 'architecture_review_note_history_v1';
export const REVIEW_INTERVALS = [0, 1, 2, 4, 7, 15, 30];
export const LEVELS = ['new', 'vague', 'mastered'];
// Asia/Shanghai civil date (UTC+8, no DST). Same day boundary as @atlas/domain
// shanghaiDate. This file is loaded by the static page, so it does not import
// the workspace package. Host local time is not the study day.
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const day = (date = new Date()) => { const shifted = new Date(new Date(date).getTime() + SHANGHAI_OFFSET_MS); return [shifted.getUTCFullYear(), String(shifted.getUTCMonth() + 1).padStart(2, '0'), String(shifted.getUTCDate()).padStart(2, '0')].join('-'); };
export const plusDays = (iso, amount) => { const match = ISO_DATE.exec(iso); if (!match) return day(); const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + amount)); return [next.getUTCFullYear(), String(next.getUTCMonth() + 1).padStart(2, '0'), String(next.getUTCDate()).padStart(2, '0')].join('-'); };
const emptyRecord = () => ({ level: 'new', stage: 0, count: 0, last: '', next: day(), notes: ['', '', ''], started: day(), attempt: null, essay: '' });
const normalizeRecord = (value) => { const record = { ...emptyRecord(), ...(value && typeof value === 'object' ? value : {}) }; record.level = LEVELS.includes(record.level) ? record.level : 'new'; record.stage = Math.min(REVIEW_INTERVALS.length - 1, Math.max(0, Number(record.stage) || 0)); record.count = Math.max(0, Number(record.count) || 0); record.next = typeof record.next === 'string' && record.next ? record.next : day(); record.notes = Array.isArray(record.notes) ? record.notes.slice(0, 3) : []; while (record.notes.length < 3) record.notes.push(''); record.attempt = parseAttempt(record.attempt); record.essay = typeof record.essay === 'string' ? record.essay.slice(0, ESSAY_LIMIT) : ''; return record; };
function readList(storage, key) {
  try {
    const value = JSON.parse(storage?.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function writeList(storage, key, value) {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    /* The study record persist reports a storage failure. */
  }
}
export function readAttemptLog(storage = globalThis.localStorage) {
  return readList(storage, ATTEMPT_LOG_KEY).flatMap((item) => {
    const entry = parseAttemptEntry(item);
    return entry ? [entry] : [];
  });
}
export function appendAttemptLog(entries, storage = globalThis.localStorage) {
  const next = readAttemptLog(storage).concat(entries);
  writeList(storage, ATTEMPT_LOG_KEY, next);
  return next;
}
export function readNoteHistory(storage = globalThis.localStorage) {
  return readList(storage, NOTE_HISTORY_KEY).flatMap((item) => {
    const entry = parseNoteEntry(item);
    return entry ? [entry] : [];
  });
}
export function appendNoteHistory(questionId, notes, at, storage = globalThis.localStorage) {
  const current = readNoteHistory(storage);
  let previous = ['', '', ''];
  for (let index = current.length - 1; index >= 0; index -= 1) {
    if (current[index].questionId === questionId) {
      previous = current[index].notes;
      break;
    }
  }
  if (!notesChanged(previous, notes) || !hasNoteText(notes)) return current;
  const next = current.concat([{ questionId, notes: [notes[0] ?? '', notes[1] ?? '', notes[2] ?? ''], at }]);
  writeList(storage, NOTE_HISTORY_KEY, next);
  return next;
}
export function createStudyRepository(questions, storage = globalThis.localStorage) { let records = {}; try { records = JSON.parse(storage?.getItem(STORAGE_KEY) || '{}') || {}; } catch { records = {}; } for (const question of questions) records[question.id] = normalizeRecord(records[question.id]); return { records, persist() { try { storage?.setItem(STORAGE_KEY, JSON.stringify(records)); return true; } catch { return false; } }, reset() { for (const question of questions) records[question.id] = emptyRecord(); this.persist(); } }; }
