import { describe, expect, it } from 'vitest';
import { formatMoney, formatPercent, normalizeMoneyInput } from '@/lib/money';

const norm = (s: string) => s.replace(/\s/g, ' ');

describe('formatMoney', () => {
  it('formats decimal strings as ARS by default', () => {
    expect(norm(formatMoney('1234.5'))).toBe('$ 1.234,50');
  });
  it('keeps precision beyond float range (no Number conversion)', () => {
    expect(norm(formatMoney('999999999999.99'))).toBe('$ 999.999.999.999,99');
  });
  it('formats zero and negative values', () => {
    expect(norm(formatMoney('0'))).toBe('$ 0,00');
    expect(norm(formatMoney('-15.2'))).toBe('-$ 15,20');
  });
  it('rejects non-decimal input', () => {
    expect(() => formatMoney('12,50')).toThrow();
  });
});

describe('normalizeMoneyInput', () => {
  it.each([
    ['1.234,50', '1234.50'],
    ['128,5', '128.5'],
    ['$ 1.234', '1234'],
    ['1.234.567,89', '1234567.89'],
    ['1.234.567', '1234567'],
    ['128.50', '128.50'],
    ['  42 ', '42'],
    ['', ''],
  ])('%s → %s', (input, expected) => {
    expect(normalizeMoneyInput(input)).toBe(expected);
  });
  it('leaves ambiguous garbage for the schema to reject', () => {
    expect(normalizeMoneyInput('1,2,3')).toBe('1,2,3');
    expect(normalizeMoneyInput('abc')).toBe('abc');
  });
});

describe('formatPercent', () => {
  it('formats API percentage strings in es-AR', () => {
    expect(norm(formatPercent('82.5'))).toBe('82,50 %');
    expect(norm(formatPercent('-12.30'))).toBe('-12,30 %');
  });
  it('shows "Not available" for null (zero denominator)', () => {
    expect(formatPercent(null)).toBe('Not available');
  });
});
