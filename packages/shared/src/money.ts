import { z } from 'zod';

/**
 * Money travels over the wire as a decimal STRING ("1234.50"), never a JS number.
 * Max 12 integer digits + 2 decimals to fit NUMERIC(14,2).
 */
export const MONEY_REGEX = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;

/** Any non-negative money string (e.g. totals, balances may be 0). */
export const moneyStringSchema = z
  .string()
  .trim()
  .regex(MONEY_REGEX, 'Must be a decimal amount with at most 2 decimal places');

/** Strictly positive money string — transaction amounts, budgets, targets (BR §2.3). */
export const positiveMoneyStringSchema = moneyStringSchema.refine(
  (v) => /[1-9]/.test(v),
  'Amount must be greater than zero',
);

export const DEFAULT_CURRENCY = 'ARS';
export const currencySchema = z.string().length(3).toUpperCase().default(DEFAULT_CURRENCY);
