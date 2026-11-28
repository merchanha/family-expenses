import { describe, expect, it } from 'vitest';
import { budgetFormDefaults, budgetFormSchema } from '@/features/budgets/domain/budget-form';

describe('budgetFormSchema', () => {
  it('normalises es-AR amounts and keeps them as strings', () => {
    expect(budgetFormSchema.parse({ amount: '1.234,50', splitMode: 'DEFAULT', splitPartner1Percent: '' })).toEqual({
      amount: '1234.50',
      splitPartner1Percent: null,
    });
  });

  it('rejects a zero or empty amount', () => {
    expect(budgetFormSchema.safeParse({ amount: '0', splitMode: 'DEFAULT', splitPartner1Percent: '' }).success).toBe(false);
    expect(budgetFormSchema.safeParse({ amount: '', splitMode: 'DEFAULT', splitPartner1Percent: '' }).success).toBe(false);
  });

  it('accepts a custom split 0–100 as an integer', () => {
    expect(budgetFormSchema.parse({ amount: '100', splitMode: 'CUSTOM', splitPartner1Percent: '60' }).splitPartner1Percent).toBe(60);
    expect(budgetFormSchema.parse({ amount: '100', splitMode: 'CUSTOM', splitPartner1Percent: '0' }).splitPartner1Percent).toBe(0);
  });

  it.each(['101', '-1', '50.5', '', 'abc'])('rejects custom split %s', (split) => {
    expect(budgetFormSchema.safeParse({ amount: '100', splitMode: 'CUSTOM', splitPartner1Percent: split }).success).toBe(false);
  });

  it('prefills from an existing budget', () => {
    expect(budgetFormDefaults({ amount: '800.00', splitPartner1Percent: 60 })).toEqual({
      amount: '800.00',
      splitMode: 'CUSTOM',
      splitPartner1Percent: '60',
    });
    expect(budgetFormDefaults(null)).toEqual({ amount: '', splitMode: 'DEFAULT', splitPartner1Percent: '' });
  });
});
