import { z } from 'zod';
import { partnerSlotSchema } from './enums';
import { partnerFilterSchema, periodQueryFields, refinePeriod, resolvedPeriodSchema } from './periods';

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
