import type { CategoryComparison, DateRange } from '@tandem/shared';

/**
 * Financial Progress display rules (decision #16). Signs and labels only: every change, variance
 * and percentage is the API's.
 */

export type Direction = 'up' | 'down' | 'flat';

/** Direction of an API signed decimal string ("-60.00" → down, "0.00" → flat). */
export function directionOf(value: string): Direction {
  const v = value.trim();
  if (/^-?0+(?:\.0+)?$/.test(v)) return 'flat';
  return v.startsWith('-') ? 'down' : 'up';
}

/** "-60.00" → "60.00" (string-only). */
export function unsigned(value: string): string {
  return value.trim().replace(/^[-+]/, '');
}

/**
 * Whether a change is good news, for color. More income or buffer is good; more spending is not.
 * A spending increase is NOT a budget overrun; it's labelled "up"/"down", never "exceeded".
 */
export function changeTone(direction: Direction, higherIsBetter: boolean): 'positive' | 'negative' | 'neutral' {
  if (direction === 'flat') return 'neutral';
  return (direction === 'up') === higherIsBetter ? 'positive' : 'negative';
}

const MONTH_SHORT = (month: number) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, month - 1, 15)));

/** "Nov 1–21" for a range inside one month; "Oct 30 – Nov 2" otherwise. */
export function rangeLabel({ from, to }: DateRange): string {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return `${from} – ${to}`;
  if (fy === ty && fm === tm) return fd === td ? `${MONTH_SHORT(fm)} ${fd}` : `${MONTH_SHORT(fm)} ${fd}–${td}`;
  return `${MONTH_SHORT(fm)} ${fd} – ${MONTH_SHORT(tm)} ${td}`;
}

/** "Nov 1–21 vs Oct 1–21". */
export function comparisonLabel(current: DateRange, previous: DateRange): string {
  return `${rangeLabel(current)} vs ${rangeLabel(previous)}`;
}

export type VarianceFilter = 'ALL' | 'INCREASES' | 'DECREASES';

/** Client-side chip filter on the API's variance sign (decision #16). */
export function filterCategories(rows: CategoryComparison[], filter: VarianceFilter): CategoryComparison[] {
  if (filter === 'ALL') return rows;
  const want: Direction = filter === 'INCREASES' ? 'up' : 'down';
  return rows.filter((r) => directionOf(r.varianceAmount) === want);
}
