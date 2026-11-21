import { budgetSplitPercentSchema, positiveMoneyStringSchema, z } from '@tandem/shared';
import { normalizeMoneyInput } from '@/lib/money';

/**
 * Envelope edit form (decision #19): monthly amount (> 0, es-AR input normalised, kept a string)
 * and the optional Partner 1 split (0–100) or the household default.
 */
export const budgetFormSchema = z
  .object({
    amount: z.string().trim().min(1, 'Amount is required').transform(normalizeMoneyInput).pipe(positiveMoneyStringSchema),
    splitMode: z.enum(['DEFAULT', 'CUSTOM']),
    splitPartner1Percent: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (v.splitMode !== 'CUSTOM') return;
    const valid = /^\d{1,3}$/.test(v.splitPartner1Percent) && budgetSplitPercentSchema.safeParse(Number(v.splitPartner1Percent)).success;
    if (!valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['splitPartner1Percent'], message: 'Use a whole number from 0 to 100' });
    }
  })
  .transform((v) => ({
    amount: v.amount,
    splitPartner1Percent: v.splitMode === 'CUSTOM' ? Number(v.splitPartner1Percent) : null,
  }));

export type BudgetFormValues = z.input<typeof budgetFormSchema>;
export type BudgetFormOutput = z.output<typeof budgetFormSchema>;

export function budgetFormDefaults(budget: { amount: string; splitPartner1Percent: number | null } | null): BudgetFormValues {
  return {
    amount: budget?.amount ?? '',
    splitMode: budget?.splitPartner1Percent == null ? 'DEFAULT' : 'CUSTOM',
    splitPartner1Percent: budget?.splitPartner1Percent == null ? '' : String(budget.splitPartner1Percent),
  };
}
