import { createContext, useContext } from 'react';
import type { Transaction, TransactionType } from '@tandem/shared';

export interface TransactionDialogValue {
  /** Open the Add Transaction modal (global "New Expense" CTA, ⌘K / Ctrl+K). */
  openNew(options?: { type?: TransactionType }): void;
  openEdit(transaction: Transaction): void;
}

/** App-wide UI concern (apps/web/CLAUDE.md §7): one modal, opened from anywhere in the shell. */
export const TransactionDialogContext = createContext<TransactionDialogValue | null>(null);

export function useTransactionDialog(): TransactionDialogValue {
  const ctx = useContext(TransactionDialogContext);
  if (!ctx) throw new Error('useTransactionDialog must be used inside <TransactionDialogProvider>');
  return ctx;
}
