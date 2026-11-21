import Decimal from 'decimal.js';
import { BudgetStatus } from '@tandem/shared';
import { percentOf } from '../../../common/percent';

export const APPROACHING_FROM_PERCENT = new Decimal(80);
export const EXCEEDED_FROM_PERCENT = new Decimal(100);

/**
 * BUSINESS_RULES §3 status bands, applied to the ROUNDED 2-dp utilization (decision #18), so
 * what the user sees matches the band: 79.996 → 80.00 → APPROACHING; 99.994 → 99.99 → APPROACHING.
 */
export function budgetStatus(roundedUtilization: Decimal): BudgetStatus {
  if (roundedUtilization.gte(EXCEEDED_FROM_PERCENT)) return BudgetStatus.EXCEEDED;
  if (roundedUtilization.gte(APPROACHING_FROM_PERCENT)) return BudgetStatus.APPROACHING;
  return BudgetStatus.WITHIN;
}

export interface EnvelopeFigures {
  /** budget − spent (negative when over); null with no budget. */
  remaining: Decimal | null;
  /** spent / budget × 100, half-up 2 dp; null with no budget. */
  utilization: Decimal | null;
  status: BudgetStatus | null;
}

/** `spent` is already partner-filtered. Budget amounts are always > 0 (DB CHECK + schema). */
export function calculateEnvelope(spent: Decimal, budget: Decimal | null): EnvelopeFigures {
  if (budget === null) return { remaining: null, utilization: null, status: null };
  const utilization = percentOf(spent, budget);
  return { remaining: budget.minus(spent), utilization, status: utilization ? budgetStatus(utilization) : null };
}

export interface EnvelopeSummary {
  monthlyAllocation: Decimal;
  consumed: Decimal;
  consumedPercent: Decimal | null;
  status: BudgetStatus | null;
  remaining: Decimal;
  budgetCount: number;
}

/** Envelope KPIs: only budgeted categories count toward `consumed`. */
export function summarizeEnvelopes(rows: readonly { spent: Decimal; budget: Decimal | null }[]): EnvelopeSummary {
  let monthlyAllocation = new Decimal(0);
  let consumed = new Decimal(0);
  let budgetCount = 0;
  for (const row of rows) {
    if (row.budget === null) continue;
    monthlyAllocation = monthlyAllocation.plus(row.budget);
    consumed = consumed.plus(row.spent);
    budgetCount += 1;
  }
  const consumedPercent = percentOf(consumed, monthlyAllocation);
  return {
    monthlyAllocation,
    consumed,
    consumedPercent,
    status: consumedPercent ? budgetStatus(consumedPercent) : null,
    remaining: monthlyAllocation.minus(consumed),
    budgetCount,
  };
}
