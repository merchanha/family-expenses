import type { ResolvedPeriod } from '@tandem/shared';

/** Calendar date (`YYYY-MM-DD`) of `now` in an IANA timezone (BUSINESS_RULES §10.6). */
export function todayInTimeZone(now: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Inclusive first/last day of a calendar month. */
export function monthPeriod(year: number, month: number): ResolvedPeriod {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}`, year, month };
}

export interface PeriodInput {
  year?: number;
  month?: number;
  from?: string;
  to?: string;
}

/** year+month or from+to (already validated by the shared schema); otherwise null. */
export function explicitPeriod(input: PeriodInput): ResolvedPeriod | null {
  if (input.year !== undefined && input.month !== undefined) return monthPeriod(input.year, input.month);
  if (input.from !== undefined && input.to !== undefined) return { from: input.from, to: input.to, year: null, month: null };
  return null;
}

/** Explicit period, or the current month in the household timezone. */
export function periodOrCurrentMonth(input: PeriodInput, now: Date, timeZone: string): ResolvedPeriod {
  const explicit = explicitPeriod(input);
  if (explicit) return explicit;
  const [y, m] = todayInTimeZone(now, timeZone).split('-').map((p) => parseInt(p, 10));
  return monthPeriod(y, m);
}

/** `YYYY-MM-DD` → Date at UTC midnight, the form Prisma expects for `@db.Date` columns. */
export const dateOnlyToDate = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

/** `@db.Date` value from Prisma → `YYYY-MM-DD`. */
export const dateToDateOnly = (value: Date): string => value.toISOString().slice(0, 10);

/** The calendar month `delta` months away (negative = earlier). */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Every `YYYY-MM-DD` from `from` to `to` inclusive (empty when from > to). */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = dateOnlyToDate(from); dateToDateOnly(d) <= to; d = new Date(d.getTime() + 86_400_000)) {
    out.push(dateToDateOnly(d));
  }
  return out;
}

