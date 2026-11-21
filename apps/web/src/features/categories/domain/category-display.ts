import type { TransactionType } from '@tandem/shared';

export const TYPE_LABEL: Record<TransactionType, string> = { EXPENSE: 'Expense', INCOME: 'Income' };
export const TYPE_PLURAL: Record<TransactionType, string> = { EXPENSE: 'Expense categories', INCOME: 'Income categories' };

/** "Used by 3 transactions" / "Not used yet". */
export function usageLabel(count: number): string {
  if (count === 0) return 'Not used yet';
  return `Used by ${count} transaction${count === 1 ? '' : 's'}`;
}
