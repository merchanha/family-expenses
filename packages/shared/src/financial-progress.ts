import { z } from 'zod';
import { partnerSlotSchema } from './enums';
import { dateRangeSchema, monthQueryFields, partnerFilterSchema, refineMonth } from './periods';
import { transactionCategorySchema } from './transactions';

/** Trend window: number of calendar months ending at the anchor month M (MOM = 2). */
export const ProgressWindow = { MOM: 'MOM', '3M': '3M', '6M': '6M' } as const;
export type ProgressWindow = (typeof ProgressWindow)[keyof typeof ProgressWindow];
export const progressWindowSchema = z.enum(['MOM', '3M', '6M']);

/**
 * GET /financial-progress/comparison?year=&month=&window=&partner= (roadmap decision #16).
 * Anchor month M defaults to the current month (household timezone); window defaults to MOM.
 * A month after the current one → 422 FUTURE_PERIOD.
 */
export const financialProgressQuerySchema = z
  .object({ ...monthQueryFields, window: progressWindowSchema.default('MOM'), partner: partnerFilterSchema })
  .superRefine(refineMonth);
export type FinancialProgressQuery = z.infer<typeof financialProgressQuerySchema>;

/** Money KPI: current vs previous. changePercent = (cur − prev) / prev × 100, null when prev = 0 (≤ 0 for the buffer). */
export const moneyComparisonSchema = z.object({
  current: z.string(),
  previous: z.string(),
  changeAmount: z.string(),
  changePercent: z.string().nullable(),
});
export type MoneyComparison = z.infer<typeof moneyComparisonSchema>;

/** Savings rate KPI: percentage-point delta (cur − prev), null if either side is null. */
export const rateComparisonSchema = z.object({
  current: z.string().nullable(),
  previous: z.string().nullable(),
  changePoints: z.string().nullable(),
});
export type RateComparison = z.infer<typeof rateComparisonSchema>;

export const trendMonthSchema = z.object({
  year: z.number().int(),
  month: z.number().int(),
  from: z.string(),
  to: z.string(),
  income: z.string(),
  expenses: z.string(),
  netCashFlowBuffer: z.string(),
  /** True only for the in-progress current month (days 1..today). */
  isPartial: z.boolean(),
});
export type TrendMonth = z.infer<typeof trendMonthSchema>;

export const categoryComparisonSchema = z.object({
  category: transactionCategorySchema,
  current: z.string(),
  previous: z.string(),
  varianceAmount: z.string(),
  /** null when previous = 0. */
  variancePercent: z.string().nullable(),
});
export type CategoryComparison = z.infer<typeof categoryComparisonSchema>;

export const financialProgressResponseSchema = z.object({
  year: z.number().int(),
  month: z.number().int(),
  window: progressWindowSchema,
  partner: partnerSlotSchema.nullable(),
  currency: z.string(),
  /** Equivalent periods (BUSINESS_RULES §6): e.g. Nov 1–21 vs Oct 1–21; past months are full vs full. */
  current: dateRangeSchema,
  previous: dateRangeSchema,
  isPartial: z.boolean(),
  kpis: z.object({
    totalSpending: moneyComparisonSchema,
    householdIncome: moneyComparisonSchema,
    netCashFlowBuffer: moneyComparisonSchema,
    savingsRate: rateComparisonSchema,
  }),
  /** One row per calendar month, oldest first, ending at M (2 / 3 / 6 rows). */
  trend: z.array(trendMonthSchema),
  /** Expense categories with a non-zero total in either period (inactive included), current desc then name. */
  categories: z.array(categoryComparisonSchema),
});
export type FinancialProgressResponse = z.infer<typeof financialProgressResponseSchema>;
