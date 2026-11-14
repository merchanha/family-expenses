import { describe, expect, it } from 'vitest';
import { formatMoney } from '@/lib/money';

const norm = (s: string) => s.replace(/\s/g, ' ');

describe('formatMoney', () => {
  it('formats decimal strings as ARS by default', () => {
    expect(norm(formatMoney('1234.5'))).toBe('$ 1.234,50');
  });
  it('keeps precision beyond float range (no Number conversion)', () => {
    expect(norm(formatMoney('999999999999.99'))).toBe('$ 999.999.999.999,99');
  });
  it('rejects non-decimal input', () => {
    expect(() => formatMoney('12,50')).toThrow();
  });
});
