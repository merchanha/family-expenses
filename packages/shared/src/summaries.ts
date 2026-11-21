import { z } from 'zod';
import { partnerSlotSchema } from './enums';
import { isoDateSchema, monthQueryFields, partnerFilterSchema, periodQueryFields, refineMonth, refinePeriod, resolvedPeriodSchema } from './periods';
import { transactionCategorySchema } from './transactions';

/**
 * GET /summaries/period?year=&month=&partner= (or from=&to=).
 * No period → the current calendar month in the household timezone.
 */
export const periodSummaryQuerySchema = z
  .object({ ...periodQueryFields, partner: partnerFilterSchema })
  .superRefine(refinePeriod);
export type PeriodSummaryQuery = z.infer<typeof periodSummaryQuerySchema>;

/** Totals by transactionDate. Money = 2-decimal strings; savingsRate = 2-dp string or null. */
export const periodSummaryResponseSchema = z.object({
  period: resolvedPeriodSchema,
  /** Null = All Shared. With a partner, every figure uses only transactions paid by that partner. */
  partner: partnerSlotSchema.nullable(),
  currency: z.string(),
  income: z.string(),
  expenses: z.string(),
  /** income − expenses (may be negative). */
  netCashFlowBuffer: z.string(),
  /** (income − expenses) / income × 100, half-up 2 dp; null when income = 0 ("not available"). */
  savingsRate: z.string().nullable(),
  transactionCount: z.number().int(),
});
export type PeriodSummaryResponse = z.infer<typeof periodSummaryResponseSchema>;

/** GET /summaries/charts?year=&month=&partner= — default = current month (household timezone). */
export const dashboardChartsQuerySchema = z
  .object({ ...monthQueryFields, partner: partnerFilterSchema })
  .superRefine(refineMonth);
export type DashboardChartsQuery = z.infer<typeof dashboardChartsQuerySchema>;

/** One point per day (actuals only). Past month: every day; current month: day 1..today; future month: none. */
export const cashFlowPointSchema = z.object({
  date: isoDateSchema,
  cumulativeIncome: z.string(),
  cumulativeExpenses: z.string(),
});
export type CashFlowPoint = z.infer<typeof cashFlowPointSchema>;

export const categorySpendSchema = z.object({
  category: transactionCategorySchema,
  amount: z.string(),
  /** amount / total expenses × 100, half-up 2 dp (shares may not add up to exactly 100.00). */
  sharePercent: z.string(),
});
export type CategorySpend = z.infer<typeof categorySpendSchema>;

export const dashboardChartsResponseSchema = z.object({
  period: resolvedPeriodSchema,
  partner: partnerSlotSchema.nullable(),
  currency: z.string(),
  cashFlowTrajectory: z.array(cashFlowPointSchema),
  /** Expense categories with spend > 0 (inactive included), amount desc then name. */
  spendingByCategory: z.array(categorySpendSchema),
  /** Total expenses of the whole month (the denominator of sharePercent). */
  totalExpenses: z.string(),
});
export type DashboardChartsResponse = z.infer<typeof dashboardChartsResponseSchema>;
