import Decimal from 'decimal.js';
import { calculatePeriodTotals, roundPercent } from './period-totals';

const d = (v: string) => new Decimal(v);

describe('calculatePeriodTotals', () => {
  it('computes net cash flow buffer and savings rate', () => {
    const t = calculatePeriodTotals(d('1000.00'), d('175.50'));
    expect(t.netCashFlowBuffer.toFixed(2)).toBe('824.50');
    expect(t.savingsRate?.toFixed(2)).toBe('82.45');
  });

  it('savings rate is null (not available) when income is 0', () => {
    const t = calculatePeriodTotals(d('0'), d('250.00'));
    expect(t.savingsRate).toBeNull();
    expect(t.netCashFlowBuffer.toFixed(2)).toBe('-250.00');
  });

  it('is 0 with no activity, and negative when expenses exceed income', () => {
    expect(calculatePeriodTotals(d('0'), d('0')).netCashFlowBuffer.toFixed(2)).toBe('0.00');
    expect(calculatePeriodTotals(d('100'), d('150')).savingsRate?.toFixed(2)).toBe('-50.00');
    expect(calculatePeriodTotals(d('100'), d('100')).savingsRate?.toFixed(2)).toBe('0.00');
  });

  it('rounds half-up at the 2-decimal boundary', () => {
    // (8 − 7) / 8 × 100 = 12.5 exactly; (200 − 199.99)/200×100 = 0.005 → 0.01
    expect(calculatePeriodTotals(d('8'), d('7')).savingsRate?.toFixed(2)).toBe('12.50');
    expect(calculatePeriodTotals(d('200'), d('199.99')).savingsRate?.toFixed(2)).toBe('0.01');
    // 1/3 → 33.333… → 33.33; 2/3 → 66.666… → 66.67
    expect(calculatePeriodTotals(d('3'), d('2')).savingsRate?.toFixed(2)).toBe('33.33');
    expect(calculatePeriodTotals(d('3'), d('1')).savingsRate?.toFixed(2)).toBe('66.67');
    expect(roundPercent(d('82.445')).toFixed(2)).toBe('82.45');
    expect(roundPercent(d('82.444')).toFixed(2)).toBe('82.44');
  });

  it('has no floating-point drift on cents', () => {
    // 0.1 + 0.2 style: 0.30 income, 0.10 expenses
    const t = calculatePeriodTotals(d('0.1').plus(d('0.2')), d('0.10'));
    expect(t.netCashFlowBuffer.toFixed(2)).toBe('0.20');
    expect(t.savingsRate?.toFixed(2)).toBe('66.67');
  });

  it('works on a partner-filtered subset (same formula, smaller sums)', () => {
    // Partner 1 paid 500 income / 600 expenses of a household 1000/700 month.
    expect(calculatePeriodTotals(d('500'), d('600')).savingsRate?.toFixed(2)).toBe('-20.00');
    // Partner with expenses only → no income → not available.
    expect(calculatePeriodTotals(d('0'), d('100')).savingsRate).toBeNull();
  });
});
