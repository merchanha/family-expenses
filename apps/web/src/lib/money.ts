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
