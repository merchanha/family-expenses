import Decimal from 'decimal.js';

/** Percentages: half-up to 2 decimals (decimal.js ROUND_HALF_UP rounds .5 away from zero). */
export const roundPercent = (value: Decimal): Decimal => value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

/** part / whole × 100, rounded; null when whole is 0. */
export const percentOf = (part: Decimal, whole: Decimal): Decimal | null =>
  whole.isZero() ? null : roundPercent(part.div(whole).times(100));
