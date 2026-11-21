import { DEFAULT_CURRENCY, MONEY_REGEX } from '@tandem/shared';

const SIGNED_DECIMAL = /^-?\d+(?:\.\d+)?$/;

/**
 * Format a money amount that travels as a decimal STRING ("1234.50").
 * No float arithmetic: the string is handed to Intl.NumberFormat as-is
 * (ES2023 `format(string)` keeps full decimal precision).
 * Defaults to ARS / es-AR.
 */
export function formatMoney(
  amount: string,
  { currency = DEFAULT_CURRENCY, locale = 'es-AR' }: { currency?: string; locale?: string } = {},
): string {
  const value = amount.trim();
  if (!SIGNED_DECIMAL.test(value)) {
    throw new Error(`formatMoney expects a decimal string, got "${amount}"`);
  }
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Intl.NumberFormat.format accepts decimal strings natively (exact, no Number cast).
  return fmt.format(value as unknown as number);
}

/** True when `value` is a valid non-negative wire money string. */
export const isMoneyString = (value: string) => MONEY_REGEX.test(value);

/**
 * Normalise what a person types into a money input into a wire decimal string,
 * WITHOUT converting to a number (apps/web/CLAUDE.md §10). es-AR first:
 *   "1.234,50" → "1234.50", "128,5" → "128.5", "$ 1.234" → "1234"
 * A dot is still read as the decimal separator when it can't be a thousands
 * separator ("128.50" → "128.50"). The result is validated by the shared schema;
 * anything unparseable is returned trimmed so validation can reject it.
 */
export function normalizeMoneyInput(raw: string): string {
  const value = raw.replace(/[\s $]/g, '');
  if (!value) return '';
  if (value.includes(',')) {
    // Comma = decimal separator; dots are thousands separators.
    const [int = '', ...rest] = value.split(',');
    if (rest.length !== 1) return value;
    return `${int.replace(/\./g, '')}.${rest[0]}`;
  }
  const dots = value.split('.').length - 1;
  if (dots > 1) return value.replace(/\./g, ''); // "1.234.567"
  if (dots === 1 && /^\d{1,3}\.\d{3}$/.test(value)) return value.replace('.', ''); // "1.234"
  return value;
}

/**
 * Format an API percentage string ("82.50", "-12.3") as "82,50 %". `null` means
 * "not available" (zero denominator) — never shown as 0%, NaN or Infinity.
 */
export function formatPercent(value: string | null, { locale = 'es-AR' }: { locale?: string } = {}): string {
  if (value === null) return 'Not available';
  const v = value.trim();
  if (!SIGNED_DECIMAL.test(v)) throw new Error(`formatPercent expects a decimal string, got "${value}"`);
  const fmt = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${fmt.format(v as unknown as number)} %`;
}

/**
 * Short money label for chart axes ("$ 1,2 M", "$ 350 mil"). Display only; tooltips and lists
 * use the full `formatMoney`.
 */
export function formatMoneyCompact(
  amount: string,
  { currency = DEFAULT_CURRENCY, locale = 'es-AR' }: { currency?: string; locale?: string } = {},
): string {
  const value = amount.trim();
  if (!SIGNED_DECIMAL.test(value)) throw new Error(`formatMoneyCompact expects a decimal string, got "${amount}"`);
  const fmt = new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  return fmt.format(value as unknown as number);
}
