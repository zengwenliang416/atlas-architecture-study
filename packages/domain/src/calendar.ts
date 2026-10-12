const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Asia/Shanghai civil date. The zone is UTC+8 and has no daylight-saving time. */
export function shanghaiDate(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + SHANGHAI_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Add calendar days to a YYYY-MM-DD date. The arithmetic does not use the host timezone. */
export function plusDays(iso: string, amount: number): string {
  const match = ISO_DATE.exec(iso);
  const yearText = match?.[1];
  const monthText = match?.[2];
  const dayText = match?.[3];
  if (!yearText || !monthText || !dayText) {
    throw new Error(`无效日期: ${iso}`);
  }
  const next = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText) + amount));
  const year = next.getUTCFullYear();
  const month = String(next.getUTCMonth() + 1).padStart(2, '0');
  const day = String(next.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  return plusDays(value, 0) === value;
}
