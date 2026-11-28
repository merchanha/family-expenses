import { describe, expect, it } from 'vitest';
import { absAmount, daysLeftInPeriod, envelopeSplitLabel, isNegativeAmount } from '@/features/budgets/domain/budget-display';

describe('envelopeSplitLabel', () => {
  it('shows an envelope split as Partner 1 / Partner 2', () => {
    expect(envelopeSplitLabel(60, 50)).toBe('60/40');
    expect(envelopeSplitLabel(0, 50)).toBe('0/100');
  });

  it('labels the household default when the envelope has no split', () => {
    expect(envelopeSplitLabel(null, 50)).toBe('Default (50/50)');
    expect(envelopeSplitLabel(null, 70)).toBe('Default (70/30)');
  });
});

describe('daysLeftInPeriod', () => {
  const nov = { from: '2026-11-01', to: '2026-11-30' };
  it('counts today through the last day', () => {
    expect(daysLeftInPeriod(nov, '2026-11-21')).toBe(10);
    expect(daysLeftInPeriod(nov, '2026-11-30')).toBe(1);
    expect(daysLeftInPeriod(nov, '2026-11-01')).toBe(30);
  });

  it('is null outside the period', () => {
    expect(daysLeftInPeriod(nov, '2026-12-01')).toBeNull();
    expect(daysLeftInPeriod(nov, '2026-10-31')).toBeNull();
  });
});

describe('amount sign helpers', () => {
  it('reads the sign from the string', () => {
    expect(isNegativeAmount('-50.00')).toBe(true);
    expect(isNegativeAmount('0.00')).toBe(false);
    expect(absAmount('-50.00')).toBe('50.00');
    expect(absAmount('12.30')).toBe('12.30');
  });
});
