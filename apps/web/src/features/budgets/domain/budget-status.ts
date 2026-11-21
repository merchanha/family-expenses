import type { BudgetStatus } from '@tandem/shared';

/**
 * Budget status display (BUSINESS_RULES §3, PO decisions #18/#21). The band always comes from
 * the API's `status` (computed from the rounded 2-dp utilization); the web never derives it
 * from the numbers. Color is never the only signal: every band has a text label.
 */

export type BudgetTone = 'positive' | 'warning' | 'negative' | 'neutral';

export interface BudgetStatusDisplay {
  label: string;
  tone: BudgetTone;
  /** Text color for figures and labels. */
  text: string;
  /** Badge / pill background + text. */
  badge: string;
  /** Progress bar fill. */
  bar: string;
}

const DISPLAY: Record<BudgetStatus | 'NONE', BudgetStatusDisplay> = {
  WITHIN: {
    label: 'Within budget',
    tone: 'positive',
    text: 'text-positive-text',
    badge: 'bg-positive-container text-positive-text',
    bar: 'bg-positive',
  },
  APPROACHING: {
    label: 'Approaching (80%+)',
    tone: 'warning',
    text: 'text-warning-text',
    badge: 'bg-warning-container text-warning-text',
    bar: 'bg-warning',
  },
  EXCEEDED: {
    label: 'Exceeded',
    tone: 'negative',
    text: 'text-danger-text',
    badge: 'bg-negative-container text-danger-text',
    bar: 'bg-negative',
  },
  NONE: {
    label: 'No budget',
    tone: 'neutral',
    text: 'text-on-surface-variant',
    badge: 'bg-surface-container text-on-surface-variant',
    bar: 'bg-outline-variant',
  },
};

/** `null` status = no budget set → neutral. */
export function budgetStatusDisplay(status: BudgetStatus | null): BudgetStatusDisplay {
  return DISPLAY[status ?? 'NONE'];
}
