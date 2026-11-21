import { describe, expect, it } from 'vitest';
import { budgetStatusDisplay } from '@/features/budgets/domain/budget-status';

describe('budgetStatusDisplay', () => {
  it.each([
    ['WITHIN', 'Within budget', 'positive', 'bg-positive'],
    ['APPROACHING', 'Approaching (80%+)', 'warning', 'bg-warning'],
    ['EXCEEDED', 'Exceeded', 'negative', 'bg-negative'],
  ] as const)('maps %s to a labelled %s band', (status, label, tone, bar) => {
    const d = budgetStatusDisplay(status);
    expect(d).toMatchObject({ label, tone, bar });
  });

  it('shows no budget (null status) as neutral, not green', () => {
    expect(budgetStatusDisplay(null)).toMatchObject({ label: 'No budget', tone: 'neutral' });
  });
});
