/** Local-first study repository (Repository + defensive normalization). */
export const STORAGE_KEY = 'architecture_review_focused_notes_v2';
export const REVIEW_INTERVALS = [0, 1, 2, 4, 7, 15, 30];
export const LEVELS = ['new', 'vague', 'mastered'];
// Asia/Shanghai civil date (UTC+8, no DST). Same day boundary as @atlas/domain
// shanghaiDate. This file is loaded by the static page, so it does not import
// the workspace package. Host local time is not the study day.
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const day = (date = new Date()) => { const shifted = new Date(new Date(date).getTime() + SHANGHAI_OFFSET_MS); return [shifted.getUTCFullYear(), String(shifted.getUTCMonth() + 1).padStart(2, '0'), String(shifted.getUTCDate()).padStart(2, '0')].join('-'); };
export const plusDays = (iso, amount) => { const match = ISO_DATE.exec(iso); if (!match) return day(); const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + amount)); return [next.getUTCFullYear(), String(next.getUTCMonth() + 1).padStart(2, '0'), String(next.getUTCDate()).padStart(2, '0')].join('-'); };
const emptyRecord = () => ({ level: 'new', stage: 0, count: 0, last: '', next: day(), notes: ['', '', ''], started: day() });
const normalizeRecord = (value) => { const record = { ...emptyRecord(), ...(value && typeof value === 'object' ? value : {}) }; record.level = LEVELS.includes(record.level) ? record.level : 'new'; record.stage = Math.min(REVIEW_INTERVALS.length - 1, Math.max(0, Number(record.stage) || 0)); record.count = Math.max(0, Number(record.count) || 0); record.next = typeof record.next === 'string' && record.next ? record.next : day(); record.notes = Array.isArray(record.notes) ? record.notes.slice(0, 3) : []; while (record.notes.length < 3) record.notes.push(''); return record; };
export function createStudyRepository(questions, storage = globalThis.localStorage) { let records = {}; try { records = JSON.parse(storage?.getItem(STORAGE_KEY) || '{}') || {}; } catch { records = {}; } for (const question of questions) records[question.id] = normalizeRecord(records[question.id]); return { records, persist() { try { storage?.setItem(STORAGE_KEY, JSON.stringify(records)); return true; } catch { return false; } }, reset() { for (const question of questions) records[question.id] = emptyRecord(); this.persist(); } }; }
