import Decimal from 'decimal.js';

/** Percentages: half-up to 2 decimals (decimal.js ROUND_HALF_UP rounds .5 away from zero). */
export const roundPercent = (value: Decimal): Decimal => value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export interface PeriodTotals {
  income: Decimal;
  expenses: Decimal;
  /** income − expenses (BUSINESS_RULES §4, before savings). */
  netCashFlowBuffer: Decimal;
  /** (income − expenses) / income × 100, rounded; null when income = 0. */
  savingsRate: Decimal | null;
}

/** All period formulas for P2, in one pure function. Inputs are already partner-filtered sums. */
export function calculatePeriodTotals(income: Decimal, expenses: Decimal): PeriodTotals {
  const netCashFlowBuffer = income.minus(expenses);
  const savingsRate = income.isZero() ? null : roundPercent(netCashFlowBuffer.div(income).times(100));
  return { income, expenses, netCashFlowBuffer, savingsRate };
}
