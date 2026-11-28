import Decimal from 'decimal.js';
import { percentOf } from '../../../common/percent';
import { datesBetween } from '../../../common/period';

export interface DailyTotals {
  income: Decimal;
  expenses: Decimal;
}

export interface CashFlowPoint {
  date: string;
  cumulativeIncome: Decimal;
  cumulativeExpenses: Decimal;
}

/**
 * Days shown for a month (decision #17, actuals only): a past month shows every day, the current
 * month day 1..today (household timezone), a future month nothing.
 * Future-dated transactions in the current month are therefore NOT in the trajectory, while
 * spendingByCategory / totalExpenses (and /summaries/period) cover the whole month: the last point
 * equals the period summary only when the month has no future-dated rows.
 */
export function trajectoryDays(period: { from: string; to: string }, today: string): string[] {
  return datesBetween(period.from, today < period.to ? today : period.to);
}

/** Running totals per day; days without transactions repeat the previous value. */
export function buildCashFlowTrajectory(days: readonly string[], byDay: ReadonlyMap<string, DailyTotals>): CashFlowPoint[] {
  let income = new Decimal(0);
  let expenses = new Decimal(0);
  return days.map((date) => {
    const day = byDay.get(date);
    if (day) {
      income = income.plus(day.income);
      expenses = expenses.plus(day.expenses);
    }
    return { date, cumulativeIncome: income, cumulativeExpenses: expenses };
  });
}

export interface CategoryShare<C> {
  category: C;
  amount: Decimal;
  /** amount / total × 100, half-up 2 dp (shares may not add up to exactly 100.00). */
  sharePercent: Decimal;
}

/** Categories with spend > 0, amount desc then name. */
export function spendingShares<C extends { name: string }>(
  rows: readonly { category: C; amount: Decimal }[],
): { total: Decimal; items: CategoryShare<C>[] } {
  const spent = rows.filter((r) => r.amount.gt(0));
  const total = spent.reduce((sum, r) => sum.plus(r.amount), new Decimal(0));
  const items = spent
    .map((r) => ({ ...r, sharePercent: percentOf(r.amount, total) ?? new Decimal(0) }))
    .sort((a, b) => b.amount.comparedTo(a.amount) || a.category.name.localeCompare(b.category.name));
  return { total, items };
}
