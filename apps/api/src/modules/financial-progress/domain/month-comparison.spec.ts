import Decimal from 'decimal.js';
import { todayInTimeZone } from '../../../common/period';
import { FuturePeriodError } from './financial-progress.errors';
import { compareCategories, compareMoney, compareRates, resolveComparisonPeriods, trendMonths, variationPercent } from './month-comparison';

const d = (v: string) => new Decimal(v);

describe('resolveComparisonPeriods (equivalent periods, BUSINESS_RULES §6)', () => {
  it('current month: days 1..N vs previous month days 1..N', () => {
    expect(resolveComparisonPeriods(2026, 11, '2026-11-21')).toEqual({
      current: { from: '2026-11-01', to: '2026-11-21' },
      previous: { from: '2026-10-01', to: '2026-10-21' },
      isPartial: true,
    });
  });

  it('clamps to the shorter previous month (Mar 31 vs Feb 28/29, May 31 vs Apr 30)', () => {
    expect(resolveComparisonPeriods(2026, 3, '2026-03-31').previous).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(resolveComparisonPeriods(2028, 3, '2028-03-30').previous).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(resolveComparisonPeriods(2026, 5, '2026-05-31').previous).toEqual({ from: '2026-04-01', to: '2026-04-30' });
    expect(resolveComparisonPeriods(2026, 3, '2026-03-28').previous.to).toBe('2026-02-28');
  });

  it('day 1 compares one day with one day; January compares with December', () => {
    expect(resolveComparisonPeriods(2027, 1, '2027-01-01')).toEqual({
      current: { from: '2027-01-01', to: '2027-01-01' },
      previous: { from: '2026-12-01', to: '2026-12-01' },
      isPartial: true,
    });
  });

  it('past month: full vs full (Mar vs Feb)', () => {
    expect(resolveComparisonPeriods(2026, 3, '2026-11-21')).toEqual({
      current: { from: '2026-03-01', to: '2026-03-31' },
      previous: { from: '2026-02-01', to: '2026-02-28' },
      isPartial: false,
    });
  });

  it('rejects a future month', () => {
    expect(() => resolveComparisonPeriods(2026, 12, '2026-11-30')).toThrow(FuturePeriodError);
    expect(() => resolveComparisonPeriods(2027, 1, '2026-12-31')).toThrow(FuturePeriodError);
  });

  it('uses the household timezone for "today"', () => {
    // 02:00 UTC Dec 1 = Nov 30 in Buenos Aires: December is still the future there.
    const now = new Date('2026-12-01T02:00:00Z');
    const today = todayInTimeZone(now, 'America/Argentina/Buenos_Aires');
    expect(() => resolveComparisonPeriods(2026, 12, today)).toThrow(FuturePeriodError);
    expect(resolveComparisonPeriods(2026, 11, today).current.to).toBe('2026-11-30');
    expect(resolveComparisonPeriods(2026, 12, todayInTimeZone(now, 'UTC')).current).toEqual({ from: '2026-12-01', to: '2026-12-01' });
  });
});

describe('trendMonths', () => {
  const partial = resolveComparisonPeriods(2026, 2, '2026-02-10');
  it('returns 2/3/6 calendar months ending at M, oldest first; M partial when in progress', () => {
    expect(trendMonths(2026, 2, 'MOM', partial)).toEqual([
      { year: 2026, month: 1, from: '2026-01-01', to: '2026-01-31', isPartial: false },
      { year: 2026, month: 2, from: '2026-02-01', to: '2026-02-10', isPartial: true },
    ]);
    expect(trendMonths(2026, 2, '3M', partial).map((m) => `${m.year}-${m.month}`)).toEqual(['2025-12', '2026-1', '2026-2']);
    const six = trendMonths(2026, 2, '6M', partial);
    expect(six.map((m) => `${m.year}-${m.month}`)).toEqual(['2025-9', '2025-10', '2025-11', '2025-12', '2026-1', '2026-2']);
    expect(six.slice(0, 5).every((m) => !m.isPartial)).toBe(true);
  });

  it('past anchor month: every month is full', () => {
    const past = resolveComparisonPeriods(2026, 3, '2026-11-21');
    expect(trendMonths(2026, 3, 'MOM', past).at(-1)).toEqual({ year: 2026, month: 3, from: '2026-03-01', to: '2026-03-31', isPartial: false });
  });
});

describe('variation', () => {
  it('(cur − prev) / prev × 100, half-up', () => {
    expect(variationPercent(d('1200'), d('1000'))?.toFixed(2)).toBe('20.00');
    expect(variationPercent(d('800'), d('1000'))?.toFixed(2)).toBe('-20.00');
    expect(variationPercent(d('2'), d('3'))?.toFixed(2)).toBe('-33.33');
    expect(variationPercent(d('200.01'), d('200'))?.toFixed(2)).toBe('0.01'); // 0.005 → 0.01
  });

  it('is null when the baseline is 0 or negative', () => {
    expect(variationPercent(d('100'), d('0'))).toBeNull();
    expect(variationPercent(d('0'), d('0'))).toBeNull();
    expect(variationPercent(d('100'), d('-50'))).toBeNull();
  });

  it('compareMoney returns the amount delta even when % is null', () => {
    const c = compareMoney(d('150.50'), d('0'));
    expect(c.changeAmount.toFixed(2)).toBe('150.50');
    expect(c.changePercent).toBeNull();
    const buffer = compareMoney(d('300'), d('-200'));
    expect(buffer.changeAmount.toFixed(2)).toBe('500.00');
    expect(buffer.changePercent).toBeNull();
  });

  it('savings rate change is in percentage points, null if either side is null', () => {
    expect(compareRates(d('82.50'), d('80.00')).changePoints?.toFixed(2)).toBe('2.50');
    expect(compareRates(d('-10.00'), d('15.25')).changePoints?.toFixed(2)).toBe('-25.25');
    expect(compareRates(null, d('10')).changePoints).toBeNull();
    expect(compareRates(d('10'), null).changePoints).toBeNull();
  });
});

describe('compareCategories', () => {
  it('keeps categories with spend in either period, sorted by current desc then name', () => {
    const rows = compareCategories([
      { category: { name: 'Rent' }, current: d('900'), previous: d('900') },
      { category: { name: 'Travel' }, current: d('0'), previous: d('300') },
      { category: { name: 'Empty' }, current: d('0'), previous: d('0') },
      { category: { name: 'Food' }, current: d('450'), previous: d('0') },
      { category: { name: 'Bars' }, current: d('450'), previous: d('400') },
    ]);
    expect(rows.map((r) => [r.category.name, r.varianceAmount.toFixed(2), r.variancePercent?.toFixed(2) ?? null])).toEqual([
      ['Rent', '0.00', '0.00'],
      ['Bars', '50.00', '12.50'],
      ['Food', '450.00', null],
      ['Travel', '-300.00', '-100.00'],
    ]);
  });
});
