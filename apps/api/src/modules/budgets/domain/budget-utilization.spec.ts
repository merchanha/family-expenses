import Decimal from 'decimal.js';
import { budgetStatus, calculateEnvelope, summarizeEnvelopes } from './budget-utilization';

const d = (v: string) => new Decimal(v);

describe('budgetStatus (BUSINESS_RULES §3 bands)', () => {
  it.each([
    ['0.00', 'WITHIN'],
    ['79.99', 'WITHIN'],
    ['80.00', 'APPROACHING'],
    ['99.99', 'APPROACHING'],
    ['100.00', 'EXCEEDED'],
    ['250.00', 'EXCEEDED'],
  ])('%s%% → %s', (u, status) => expect(budgetStatus(d(u))).toBe(status));
});

describe('calculateEnvelope', () => {
  it('computes remaining, utilization and status', () => {
    const e = calculateEnvelope(d('412.50'), d('500.00'));
    expect(e.remaining?.toFixed(2)).toBe('87.50');
    expect(e.utilization?.toFixed(2)).toBe('82.50');
    expect(e.status).toBe('APPROACHING');
  });

  it('is all null with no budget (spent still shown by the caller)', () => {
    expect(calculateEnvelope(d('100'), null)).toEqual({ remaining: null, utilization: null, status: null });
  });

  it('hits the exact 80 and 100 edges', () => {
    expect(calculateEnvelope(d('80'), d('100')).status).toBe('APPROACHING');
    expect(calculateEnvelope(d('79.99'), d('100')).status).toBe('WITHIN');
    expect(calculateEnvelope(d('100'), d('100')).status).toBe('EXCEEDED');
    expect(calculateEnvelope(d('99.99'), d('100')).status).toBe('APPROACHING');
  });

  it('bands on the rounded utilization, half-up (decision #18)', () => {
    // 79.996% → 80.00 → APPROACHING
    const a = calculateEnvelope(d('79.996'), d('100'));
    expect(a.utilization?.toFixed(2)).toBe('80.00');
    expect(a.status).toBe('APPROACHING');
    // 99.995% → 100.00 → EXCEEDED; 99.994% → 99.99 → APPROACHING
    expect(calculateEnvelope(d('99.995'), d('100')).status).toBe('EXCEEDED');
    expect(calculateEnvelope(d('99.994'), d('100')).status).toBe('APPROACHING');
    // 1/3 → 33.33; 2/3 → 66.67
    expect(calculateEnvelope(d('1'), d('3')).utilization?.toFixed(2)).toBe('33.33');
    expect(calculateEnvelope(d('2'), d('3')).utilization?.toFixed(2)).toBe('66.67');
  });

  it('decision #21: 159.99 of 200.00 = 79.995% → "80.00" → APPROACHING (summary too)', () => {
    const e = calculateEnvelope(d('159.99'), d('200.00'));
    expect(e.utilization?.toFixed(2)).toBe('80.00');
    expect(e.status).toBe('APPROACHING');
    const s = summarizeEnvelopes([{ spent: d('159.99'), budget: d('200.00') }]);
    expect(s.consumedPercent?.toFixed(2)).toBe('80.00');
    expect(s.status).toBe('APPROACHING');
    // Just below the half: 159.98 / 200 = 79.99% → WITHIN.
    expect(calculateEnvelope(d('159.98'), d('200.00')).status).toBe('WITHIN');
  });

  it('goes negative when over budget and is 0% with no spend', () => {
    const over = calculateEnvelope(d('650.10'), d('500'));
    expect(over.remaining?.toFixed(2)).toBe('-150.10');
    expect(over.utilization?.toFixed(2)).toBe('130.02');
    expect(over.status).toBe('EXCEEDED');
    const none = calculateEnvelope(d('0'), d('500'));
    expect(none.utilization?.toFixed(2)).toBe('0.00');
    expect(none.status).toBe('WITHIN');
  });

  it('has no floating-point drift', () => {
    expect(calculateEnvelope(d('0.1').plus(d('0.2')), d('0.30')).utilization?.toFixed(2)).toBe('100.00');
  });
});

describe('summarizeEnvelopes', () => {
  it('counts only budgeted categories toward consumed', () => {
    const s = summarizeEnvelopes([
      { spent: d('300'), budget: d('400') },
      { spent: d('150'), budget: d('100') },
      { spent: d('999'), budget: null },
    ]);
    expect(s.monthlyAllocation.toFixed(2)).toBe('500.00');
    expect(s.consumed.toFixed(2)).toBe('450.00');
    expect(s.consumedPercent?.toFixed(2)).toBe('90.00');
    expect(s.status).toBe('APPROACHING');
    expect(s.remaining.toFixed(2)).toBe('50.00');
    expect(s.budgetCount).toBe(2);
  });

  it('has null percent/status with no budgets', () => {
    const s = summarizeEnvelopes([{ spent: d('10'), budget: null }]);
    expect(s).toMatchObject({ consumedPercent: null, status: null, budgetCount: 0 });
    expect(s.monthlyAllocation.toFixed(2)).toBe('0.00');
    expect(s.remaining.toFixed(2)).toBe('0.00');
  });

  it('works on partner-filtered spend (same formula, smaller sums)', () => {
    // Household spent 450 of 500; Partner 1 paid 200 of that.
    const s = summarizeEnvelopes([{ spent: d('200'), budget: d('500') }]);
    expect(s.consumedPercent?.toFixed(2)).toBe('40.00');
    expect(s.status).toBe('WITHIN');
  });
});
