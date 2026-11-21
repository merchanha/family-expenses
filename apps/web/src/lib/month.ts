import { DEFAULT_TIMEZONE } from '@tandem/shared';

/** A calendar month, as the API's `year` + `month` (1–12) period query. */
export interface YearMonth {
  year: number;
  month: number;
}

const PARAM = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** `?month=2026-11` → { year: 2026, month: 11 }; anything else → null. */
export function parseMonthParam(value: string | null | undefined): YearMonth | null {
  const m = value ? PARAM.exec(value) : null;
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

export function toMonthParam({ year, month }: YearMonth): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function compareMonths(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/** The current month in the household's timezone (BUSINESS_RULES: reporting uses the household timezone). */
export function currentMonth(timeZone: string = DEFAULT_TIMEZONE, now: Date = new Date()): YearMonth {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric' }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month') };
}

/** Today as `YYYY-MM-DD` in the household's timezone (default transaction date). */
export function todayIso(timeZone: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** "November 2026" — the UI is English (money stays es-AR, see lib/money.ts). */
export function monthLabel({ year, month }: YearMonth, locale = 'en-US'): string {
  // Midday UTC on the 15th avoids any timezone rolling the month over.
  const date = new Date(Date.UTC(year, month - 1, 15, 12));
  const name = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(date);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

/**
 * A `YYYY-MM-DD` calendar date for display ("21 Nov 2026", day first as in Argentina). Treated as a
 * calendar date, not an instant (apps/web/CLAUDE.md §9).
 */
export function formatCalendarDate(iso: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }, locale = 'en-GB'): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
