import { z } from 'zod';
import { partnerSlotSchema } from './enums';

/** Calendar date `YYYY-MM-DD` that exists (rejects 2026-02-30). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-11-21')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Not a valid calendar date');

/** Query-string integers arrive as strings. */
const queryInt = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

/**
 * Period selection on query strings (CLAUDE.md §8): either `year` + `month` (1–12)
 * or `from` + `to` (inclusive `YYYY-MM-DD`). Mixing them is rejected. All optional:
 * each endpoint documents its default when none is given.
 */
export const periodQueryFields = {
  year: queryInt(2000, 2100).optional(),
  month: queryInt(1, 12).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
};

type PeriodFields = { year?: number; month?: number; from?: string; to?: string };

/** Refinement shared by every schema built on `periodQueryFields`. */
export const refinePeriod = (v: PeriodFields, ctx: z.RefinementCtx): void => {
  const hasMonth = v.year !== undefined || v.month !== undefined;
  const hasRange = v.from !== undefined || v.to !== undefined;
  if (hasMonth && hasRange) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: 'Use either year+month or from+to, not both' });
    return;
  }
  if (hasMonth && (v.year === undefined || v.month === undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [v.year === undefined ? 'year' : 'month'], message: 'year and month go together' });
  }
  if (hasRange && (v.from === undefined || v.to === undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [v.from === undefined ? 'from' : 'to'], message: 'from and to go together' });
  }
  if (v.from !== undefined && v.to !== undefined && v.from > v.to) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'to must be on or after from' });
  }
};

/** `partner=PARTNER_1|PARTNER_2` filters on **paid by**. Omit for "All Shared". */
export const partnerFilterSchema = partnerSlotSchema.optional();

/** The period the API actually used (inclusive dates). year/month are set for month periods. */
export const resolvedPeriodSchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
  year: z.number().int().nullable(),
  month: z.number().int().nullable(),
});
export type ResolvedPeriod = z.infer<typeof resolvedPeriodSchema>;

/**
 * Month-only selection on query strings: `year` + `month` together, or neither
 * (each endpoint documents its default, usually the current month in the household timezone).
 */
export const monthQueryFields = {
  year: queryInt(2000, 2100).optional(),
  month: queryInt(1, 12).optional(),
};

export const refineMonth = (v: { year?: number; month?: number }, ctx: z.RefinementCtx): void => {
  if ((v.year === undefined) !== (v.month === undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [v.year === undefined ? 'year' : 'month'], message: 'year and month go together' });
  }
};

/** A calendar month in a request body (not a query string). */
export const yearMonthBodyFields = {
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
};

/** An inclusive date range the API resolved. */
export const dateRangeSchema = z.object({ from: isoDateSchema, to: isoDateSchema });
export type DateRange = z.infer<typeof dateRangeSchema>;
