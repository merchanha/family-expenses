import type Decimal from 'decimal.js';
import { roundPercent } from './percent';

export { roundPercent };

export interface PeriodTotals {
  income: Decimal;
  expenses: Decimal;
  /** income − expenses (BUSINESS_RULES §4, before savings). */
  netCashFlowBuffer: Decimal;
  /** (income − expenses) / income × 100, rounded; null when income = 0. */
  savingsRate: Decimal | null;
}

/** Period formulas shared by summaries and financial-progress, in one pure function. Inputs are already partner-filtered sums. */
export function calculatePeriodTotals(income: Decimal, expenses: Decimal): PeriodTotals {
  const netCashFlowBuffer = income.minus(expenses);
  const savingsRate = income.isZero() ? null : roundPercent(netCashFlowBuffer.div(income).times(100));
  return { income, expenses, netCashFlowBuffer, savingsRate };
}
