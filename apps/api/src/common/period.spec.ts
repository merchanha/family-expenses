import { dateOnlyToDate, dateToDateOnly, explicitPeriod, monthPeriod, periodOrCurrentMonth, todayInTimeZone } from './period';

const BA = 'America/Argentina/Buenos_Aires'; // UTC−3

describe('period helpers', () => {
  it('monthPeriod covers the whole calendar month, including leap February', () => {
    expect(monthPeriod(2026, 11)).toEqual({ from: '2026-11-01', to: '2026-11-30', year: 2026, month: 11 });
    expect(monthPeriod(2028, 2)).toEqual({ from: '2028-02-01', to: '2028-02-29', year: 2028, month: 2 });
    expect(monthPeriod(2026, 12).to).toBe('2026-12-31');
  });

  it('todayInTimeZone uses the household timezone, not UTC', () => {
    // 02:00 UTC on Dec 1 is still Nov 30 in Buenos Aires.
    expect(todayInTimeZone(new Date('2026-12-01T02:00:00Z'), BA)).toBe('2026-11-30');
    expect(todayInTimeZone(new Date('2026-12-01T02:00:00Z'), 'UTC')).toBe('2026-12-01');
  });

  it('periodOrCurrentMonth defaults to the current month in the household timezone', () => {
    expect(periodOrCurrentMonth({}, new Date('2026-12-01T02:00:00Z'), BA)).toMatchObject({ year: 2026, month: 11 });
    expect(periodOrCurrentMonth({}, new Date('2026-12-01T04:00:00Z'), BA)).toMatchObject({ year: 2026, month: 12 });
  });

  it('explicit periods win and from/to has no year/month', () => {
    expect(explicitPeriod({ from: '2026-01-05', to: '2026-02-10' })).toEqual({ from: '2026-01-05', to: '2026-02-10', year: null, month: null });
    expect(explicitPeriod({})).toBeNull();
    expect(periodOrCurrentMonth({ year: 2025, month: 3 }, new Date(), BA).from).toBe('2025-03-01');
  });

  it('date-only conversions round-trip', () => {
    expect(dateToDateOnly(dateOnlyToDate('2026-02-28'))).toBe('2026-02-28');
  });
});
