import Decimal from 'decimal.js';
import { buildCashFlowTrajectory, spendingShares, trajectoryDays, type DailyTotals } from './dashboard-charts';

const d = (v: string) => new Decimal(v);
const nov = { from: '2026-11-01', to: '2026-11-30' };

describe('trajectoryDays', () => {
  it('past month: every day; current month: up to today; future month: none', () => {
    expect(trajectoryDays(nov, '2026-12-05')).toHaveLength(30);
    const current = trajectoryDays(nov, '2026-11-21');
    expect(current[0]).toBe('2026-11-01');
    expect(current.at(-1)).toBe('2026-11-21');
    expect(current).toHaveLength(21);
    expect(trajectoryDays(nov, '2026-10-31')).toEqual([]);
    expect(trajectoryDays({ from: '2028-02-01', to: '2028-02-29' }, '2028-03-01')).toHaveLength(29);
  });
});

describe('buildCashFlowTrajectory', () => {
  it('accumulates per day and carries totals over empty days', () => {
    const byDay = new Map<string, DailyTotals>([
      ['2026-11-01', { income: d('1000.00'), expenses: d('0') }],
      ['2026-11-03', { income: d('0'), expenses: d('100.10') }],
      ['2026-11-04', { income: d('0.30'), expenses: d('200.20') }],
    ]);
    const points = buildCashFlowTrajectory(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'], byDay);
    expect(points.map((p) => [p.date, p.cumulativeIncome.toFixed(2), p.cumulativeExpenses.toFixed(2)])).toEqual([
      ['2026-11-01', '1000.00', '0.00'],
      ['2026-11-02', '1000.00', '0.00'],
      ['2026-11-03', '1000.00', '100.10'],
      ['2026-11-04', '1000.30', '300.30'],
    ]);
  });

  it('ignores days outside the shown range (e.g. future-dated)', () => {
    const byDay = new Map<string, DailyTotals>([['2026-11-25', { income: d('5'), expenses: d('5') }]]);
    expect(buildCashFlowTrajectory(['2026-11-01'], byDay)[0].cumulativeExpenses.toFixed(2)).toBe('0.00');
  });
});

describe('spendingShares', () => {
  it('computes shares half-up, sorted desc then name, dropping zero rows', () => {
    const { total, items } = spendingShares([
      { category: { name: 'B' }, amount: d('1') },
      { category: { name: 'A' }, amount: d('1') },
      { category: { name: 'C' }, amount: d('1') },
      { category: { name: 'Z' }, amount: d('0') },
    ]);
    expect(total.toFixed(2)).toBe('3.00');
    expect(items.map((i) => [i.category.name, i.sharePercent.toFixed(2)])).toEqual([
      ['A', '33.33'],
      ['B', '33.33'],
      ['C', '33.33'],
    ]); // 99.99 total: shares may not add to 100.00
  });

  it('orders by amount and rounds .005 up', () => {
    const { items } = spendingShares([
      { category: { name: 'Small' }, amount: d('0.01') },
      { category: { name: 'Big' }, amount: d('199.99') },
    ]);
    expect(items.map((i) => [i.category.name, i.sharePercent.toFixed(2)])).toEqual([
      ['Big', '100.00'], // 99.995 → 100.00
      ['Small', '0.01'], // 0.005 → 0.01
    ]);
  });

  it('is empty with no spend', () => {
    expect(spendingShares([])).toEqual({ total: new Decimal(0), items: [] });
  });
});
