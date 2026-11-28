import { describe, expect, it } from 'vitest';
import type { CategoryComparison } from '@tandem/shared';
import {
  changeTone,
  comparisonLabel,
  directionOf,
  filterCategories,
  rangeLabel,
  unsigned,
} from '@/features/financial-progress/domain/progress-display';

const row = (id: string, varianceAmount: string): CategoryComparison => ({
  category: { id, name: id, icon: null, color: null, type: 'EXPENSE', isActive: true },
  current: '0.00',
  previous: '0.00',
  varianceAmount,
  variancePercent: null,
});

describe('progress display', () => {
  it('reads direction from the API string', () => {
    expect(directionOf('95.00')).toBe('up');
    expect(directionOf('-60.00')).toBe('down');
    expect(directionOf('0.00')).toBe('flat');
    expect(directionOf('-0.00')).toBe('flat');
    expect(unsigned('-60.00')).toBe('60.00');
  });

  it('colors spending increases as bad and income increases as good', () => {
    expect(changeTone('up', false)).toBe('negative');
    expect(changeTone('down', false)).toBe('positive');
    expect(changeTone('up', true)).toBe('positive');
    expect(changeTone('flat', true)).toBe('neutral');
  });

  it('labels equivalent periods', () => {
    expect(comparisonLabel({ from: '2026-11-01', to: '2026-11-21' }, { from: '2026-10-01', to: '2026-10-21' })).toBe(
      'Nov 1–21 vs Oct 1–21',
    );
    expect(rangeLabel({ from: '2026-02-01', to: '2026-02-28' })).toBe('Feb 1–28');
    expect(rangeLabel({ from: '2026-03-01', to: '2026-03-01' })).toBe('Mar 1');
  });

  it('filters categories by variance sign', () => {
    const rows = [row('a', '10.00'), row('b', '-5.00'), row('c', '0.00')];
    expect(filterCategories(rows, 'ALL')).toHaveLength(3);
    expect(filterCategories(rows, 'INCREASES').map((r) => r.category.id)).toEqual(['a']);
    expect(filterCategories(rows, 'DECREASES').map((r) => r.category.id)).toEqual(['b']);
  });
});
