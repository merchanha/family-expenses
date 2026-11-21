import { z } from 'zod';
import { partnerSlotSchema } from './enums';
import { positiveMoneyStringSchema } from './money';
import { monthQueryFields, partnerFilterSchema, refineMonth, resolvedPeriodSchema, yearMonthBodyFields } from './periods';
import { transactionCategorySchema } from './transactions';

/**
 * Budgets (P3, roadmap decisions #18/#19): one optional monthly budget per EXPENSE category.
 * Status bands come from the ROUNDED 2-dp utilization: < 80 WITHIN, 80–99.99 APPROACHING, ≥ 100 EXCEEDED.
 */
export const BudgetStatus = { WITHIN: 'WITHIN', APPROACHING: 'APPROACHING', EXCEEDED: 'EXCEEDED' } as const;
export type BudgetStatus = (typeof BudgetStatus)[keyof typeof BudgetStatus];
export const budgetStatusSchema = z.enum(['WITHIN', 'APPROACHING', 'EXCEEDED']);

/** Partner 1 share for this envelope, 0–100; null = household default. Display/planning only. */
export const budgetSplitPercentSchema = z.number().int().min(0).max(100);

/**
 * PUT /budgets — upsert by categoryId + year + month (200, returns the budget).
 * Another household's / unknown category → 404 CATEGORY_NOT_FOUND. Income category → 422
 * BUDGET_CATEGORY_NOT_EXPENSE. Inactive category → 422 CATEGORY_INACTIVE, unless that month's
 * budget already exists (it stays editable). Omitting splitPartner1Percent keeps the stored value
 * on update (null on create); null clears it back to the household default.
 */
export const upsertBudgetSchema = z.object({
  categoryId: z.string().min(1).max(64),
  ...yearMonthBodyFields,
  amount: positiveMoneyStringSchema,
  splitPartner1Percent: budgetSplitPercentSchema.nullable().optional(),
});
export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;

export const budgetSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  year: z.number().int(),
  month: z.number().int(),
  amount: z.string(),
  currency: z.string(),
  splitPartner1Percent: z.number().int().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Budget = z.infer<typeof budgetSchema>;

/**
 * POST /budgets/copy-previous-month { year, month } (200). Copies M−1's budgets for ACTIVE expense
 * categories that have no budget in M yet. Never overwrites. Returns how many were created.
 */
export const copyPreviousMonthBudgetsSchema = z.object({ ...yearMonthBodyFields });
export type CopyPreviousMonthBudgetsInput = z.infer<typeof copyPreviousMonthBudgetsSchema>;
export const copyPreviousMonthBudgetsResponseSchema = z.object({ created: z.number().int() });
export type CopyPreviousMonthBudgetsResponse = z.infer<typeof copyPreviousMonthBudgetsResponseSchema>;

// DELETE /budgets/:id → 204. Unknown / other household → 404 BUDGET_NOT_FOUND.

/** GET /budgets/utilization?year=&month=&partner= — default = current month (household timezone). */
export const budgetUtilizationQuerySchema = z
  .object({ ...monthQueryFields, partner: partnerFilterSchema })
  .superRefine(refineMonth);
export type BudgetUtilizationQuery = z.infer<typeof budgetUtilizationQuerySchema>;

/** Actual spend in the envelope by **paid by** (money strings). Under a partner filter, only that slot is non-zero. */
export const envelopePaidBySchema = z.object({
  partner1: z.string(),
  partner2: z.string(),
  shared: z.string(),
});

export const envelopeSchema = z.object({
  category: transactionCategorySchema,
  budget: z
    .object({ id: z.string(), amount: z.string(), splitPartner1Percent: z.number().int().nullable() })
    .nullable(),
  /** Expenses in this category for the month (partner-filtered). */
  spent: z.string(),
  /** budget − spent; negative when over; null with no budget. */
  remaining: z.string().nullable(),
  /** spent / budget × 100, half-up 2 dp; null with no budget. */
  utilization: z.string().nullable(),
  status: budgetStatusSchema.nullable(),
  paidBy: envelopePaidBySchema,
});
export type Envelope = z.infer<typeof envelopeSchema>;

export const envelopeSummarySchema = z.object({
  /** Σ budgets of the month. */
  monthlyAllocation: z.string(),
  /** Σ spent in BUDGETED categories only. */
  consumed: z.string(),
  /** consumed / monthlyAllocation × 100; null with no budgets. */
  consumedPercent: z.string().nullable(),
  status: budgetStatusSchema.nullable(),
  /** monthlyAllocation − consumed (may be negative). */
  remaining: z.string(),
  budgetCount: z.number().int(),
});
export type EnvelopeSummary = z.infer<typeof envelopeSummarySchema>;

/**
 * Items: every active expense category, plus inactive ones with a budget or spend that month.
 * Rows without a budget are listed (with spent). Sorted by category name.
 */
export const budgetUtilizationResponseSchema = z.object({
  period: resolvedPeriodSchema,
  partner: partnerSlotSchema.nullable(),
  currency: z.string(),
  /** For split labels when an envelope's splitPartner1Percent is null. */
  defaultSplitPartner1Percent: z.number().int(),
  summary: envelopeSummarySchema,
  items: z.array(envelopeSchema),
});
export type BudgetUtilizationResponse = z.infer<typeof budgetUtilizationResponseSchema>;
