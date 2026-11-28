import { describe, expect, it } from 'vitest';
import { isZeroAmount, plotValue, shortDayLabel } from '@/features/dashboard/domain/chart-display';

describe('chart display helpers', () => {
  it('converts API strings to plot coordinates only', () => {
    expect(plotValue('1234.50')).toBe(1234.5);
    expect(plotValue('oops')).toBe(0);
  });

  it('labels calendar days without timezone drift', () => {
    expect(shortDayLabel('2026-11-01')).toBe('1 Nov');
    expect(shortDayLabel('2026-12-31')).toBe('31 Dec');
  });

  it('detects zero amounts from the string', () => {
    expect(isZeroAmount('0.00')).toBe(true);
    expect(isZeroAmount('0')).toBe(true);
    expect(isZeroAmount('0.01')).toBe(false);
    expect(isZeroAmount('10.00')).toBe(false);
  });
});
