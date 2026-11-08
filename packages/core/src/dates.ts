import type { ISODate } from './types';

const DAY_MS = 86_400_000;

/** Local midnight at the start of the given instant's local calendar day. */
export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Add calendar days in local time. DST-safe: adding 1 day across a clock
 * change lands on the same local wall-clock time, not 23/25 hours later.
 */
export function addLocalDays(d: Date, days: number): Date {
  const r = new Date(d.getTime());
  r.setDate(r.getDate() + days);
  return r;
}

/** The start of the local day `days` calendar days after `now`. */
export function dueDayStart(now: Date, days: number): Date {
  return startOfLocalDay(addLocalDays(now, days));
}

/** Fractional days elapsed between two ISO instants (b - a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return (Date.parse(b) - Date.parse(a)) / DAY_MS;
}

/** Whole local calendar days between two instants (ignores time of day; DST-safe). */
export function calendarDaysBetween(a: Date, b: Date): number {
  const sa = startOfLocalDay(a);
  const sb = startOfLocalDay(b);
  return Math.round(
    (Date.UTC(sb.getFullYear(), sb.getMonth(), sb.getDate()) -
      Date.UTC(sa.getFullYear(), sa.getMonth(), sa.getDate())) /
      DAY_MS,
  );
}

export function toISO(d: Date): ISODate {
  return d.toISOString();
}

export function isValidISO(s: unknown): s is ISODate {
  return typeof s === 'string' && !Number.isNaN(Date.parse(s));
}

/** Friendly relative description of a due date, e.g. "today", "tomorrow", "in 3 days". */
export function describeDue(due: ISODate, now: Date): string {
  const days = calendarDaysBetween(now, new Date(due));
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 14) return `in ${days} days`;
  const weeks = Math.round(days / 7);
  if (days < 60) return `in about ${weeks} weeks`;
  return `in about ${Math.round(days / 30)} months`;
}
