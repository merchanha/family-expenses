import { describe, expect, it } from 'vitest';
import {
  compareMonths,
  currentMonth,
  formatCalendarDate,
  monthLabel,
  parseMonthParam,
  shiftMonth,
  todayIso,
  toMonthParam,
} from '@/lib/month';

describe('month helpers', () => {
  it('parses and formats the ?month= param', () => {
    expect(parseMonthParam('2026-11')).toEqual({ year: 2026, month: 11 });
    expect(parseMonthParam('2026-13')).toBeNull();
    expect(parseMonthParam('2026-1')).toBeNull();
    expect(parseMonthParam(null)).toBeNull();
    expect(toMonthParam({ year: 2026, month: 3 })).toBe('2026-03');
  });

  it('shifts across year boundaries', () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 5 }, -17)).toEqual({ year: 2024, month: 12 });
    expect(compareMonths({ year: 2026, month: 1 }, { year: 2025, month: 12 })).toBeGreaterThan(0);
  });

  it('uses the household timezone for "now"', () => {
    // 02:00 UTC on Dec 1 is still Nov 30 in Buenos Aires (UTC−3).
    const now = new Date('2026-12-01T02:00:00Z');
    expect(currentMonth('America/Argentina/Buenos_Aires', now)).toEqual({ year: 2026, month: 11 });
    expect(currentMonth('UTC', now)).toEqual({ year: 2026, month: 12 });
    expect(todayIso('America/Argentina/Buenos_Aires', now)).toBe('2026-11-30');
  });

  it('labels months and calendar dates in English (day first) without timezone drift', () => {
    expect(monthLabel({ year: 2026, month: 11 })).toBe('November 2026');
    expect(formatCalendarDate('2026-11-01')).toBe('1 Nov 2026');
    expect(formatCalendarDate('2026-11-21')).toBe('21 Nov 2026');
  });
});
