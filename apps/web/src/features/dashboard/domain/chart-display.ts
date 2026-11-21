/**
 * Chart display helpers. Recharts needs numbers for geometry, so API money strings are converted
 * for PLOTTING ONLY; every label and tooltip shows the original string via formatMoney.
 */

/** Plot coordinate for an API decimal string (never used for totals). */
export function plotValue(amount: string): number {
  const n = Number.parseFloat(amount);
  return Number.isFinite(n) ? n : 0;
}

/** "2026-11-07" → "7 Nov" (calendar date, no timezone shift). */
export function shortDayLabel(iso: string, locale = 'en-GB'): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** True when an API money string is zero ("0", "0.00"). */
export function isZeroAmount(amount: string): boolean {
  return /^-?0+(?:\.0+)?$/.test(amount.trim());
}

/** Neutral fallback for a category without a color (a CSS token, not a hex literal). */
export const UNCOLORED_CATEGORY = 'var(--outline)';
