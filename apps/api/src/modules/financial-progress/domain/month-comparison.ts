import Decimal from 'decimal.js';
import type { ProgressWindow } from '@tandem/shared';
import { percentOf, roundPercent } from '../../../common/percent';
import { monthPeriod, shiftMonth } from '../../../common/period';
import { FuturePeriodError } from './financial-progress.errors';

export interface DateRange {
  from: string;
  to: string;
}

export interface ComparisonPeriods {
  current: DateRange;
  previous: DateRange;
  /** M is the in-progress current month (days 1..today). */
  isPartial: boolean;
}

const dayOf = (date: string) => parseInt(date.slice(8, 10), 10);
const monthKey = (year: number, month: number) => year * 12 + month;

/**
 * Equivalent periods (BUSINESS_RULES §6, decision #16). `today` is `YYYY-MM-DD` in the household
 * timezone. Current month M: M days 1..N vs M−1 days 1..min(N, last day of M−1). Past month: full vs
 * full. A future month → FuturePeriodError.
 */
export function resolveComparisonPeriods(year: number, month: number, today: string): ComparisonPeriods {
  const todayYear = parseInt(today.slice(0, 4), 10);
  const todayMonth = parseInt(today.slice(5, 7), 10);
  if (monthKey(year, month) > monthKey(todayYear, todayMonth)) throw new FuturePeriodError();
  const m = monthPeriod(year, month);
  const prevMonth = shiftMonth(year, month, -1);
  const prev = monthPeriod(prevMonth.year, prevMonth.month);
  if (monthKey(year, month) < monthKey(todayYear, todayMonth)) {
    return { current: { from: m.from, to: m.to }, previous: { from: prev.from, to: prev.to }, isPartial: false };
  }
  const n = dayOf(today);
  const prevDay = Math.min(n, dayOf(prev.to));
  return {
    current: { from: m.from, to: today },
    previous: { from: prev.from, to: `${prev.from.slice(0, 8)}${String(prevDay).padStart(2, '0')}` },
    isPartial: true,
  };
}

export const WINDOW_MONTHS: Record<ProgressWindow, number> = { MOM: 2, '3M': 3, '6M': 6 };

export interface TrendMonthPeriod extends DateRange {
  year: number;
  month: number;
  isPartial: boolean;
}

/** Calendar months for the trend, oldest first, ending at M. Past months full; M up to `currentTo`. */
export function trendMonths(year: number, month: number, window: ProgressWindow, periods: ComparisonPeriods): TrendMonthPeriod[] {
  const count = WINDOW_MONTHS[window];
  return Array.from({ length: count }, (_, i) => {
    const ym = shiftMonth(year, month, i - (count - 1));
    const p = monthPeriod(ym.year, ym.month);
    const isAnchor = i === count - 1;
    return {
      year: ym.year,
      month: ym.month,
      from: p.from,
      to: isAnchor ? periods.current.to : p.to,
      isPartial: isAnchor && periods.isPartial,
    };
  });
}

/** (cur − prev) / prev × 100, rounded; null unless prev > 0 (§6.4: baseline must be greater than zero). */
export function variationPercent(current: Decimal, previous: Decimal): Decimal | null {
  return previous.gt(0) ? percentOf(current.minus(previous), previous) : null;
}

export interface MoneyComparison {
  current: Decimal;
  previous: Decimal;
  changeAmount: Decimal;
  changePercent: Decimal | null;
}

export function compareMoney(current: Decimal, previous: Decimal): MoneyComparison {
  return { current, previous, changeAmount: current.minus(previous), changePercent: variationPercent(current, previous) };
}

export interface RateComparison {
  current: Decimal | null;
  previous: Decimal | null;
  /** Percentage-point delta of the rounded rates; null if either side is null. */
  changePoints: Decimal | null;
}

export function compareRates(current: Decimal | null, previous: Decimal | null): RateComparison {
  const changePoints = current !== null && previous !== null ? roundPercent(current).minus(roundPercent(previous)) : null;
  return { current, previous, changePoints };
}

export interface CategoryComparison<C> {
  category: C;
  current: Decimal;
  previous: Decimal;
  varianceAmount: Decimal;
  variancePercent: Decimal | null;
}

/** Categories with a non-zero total in either period, current desc then name. */
export function compareCategories<C extends { name: string }>(
  rows: readonly { category: C; current: Decimal; previous: Decimal }[],
): CategoryComparison<C>[] {
  return rows
    .filter((r) => !r.current.isZero() || !r.previous.isZero())
    .map((r) => ({
      ...r,
      varianceAmount: r.current.minus(r.previous),
      variancePercent: variationPercent(r.current, r.previous),
    }))
    .sort((a, b) => b.current.comparedTo(a.current) || a.category.name.localeCompare(b.category.name));
}
