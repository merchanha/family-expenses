import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Transaction, TransactionType } from '@tandem/shared';
import {
  TransactionDialogContext,
  type TransactionDialogValue,
} from '@/features/transactions/application/transaction-dialog-context';
import { TransactionFormDialog } from '@/features/transactions/presentation/components/transaction-form-dialog';

interface DialogState {
  open: boolean;
  /** Kept after closing so the closing animation doesn't flash a different form. */
  transaction: Transaction | null;
  type: TransactionType;
}

/** True for ⌘K (macOS) / Ctrl+K (elsewhere). */
export function isNewTransactionShortcut(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k';
}

/**
 * Hosts the one Add/Edit Transaction modal for the app shell and the global
 * ⌘K / Ctrl+K shortcut. Radix returns focus to the trigger on close, so the
 * shortcut never traps focus.
 */
export function TransactionDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({ open: false, transaction: null, type: 'EXPENSE' });

  const value = useMemo<TransactionDialogValue>(
    () => ({
      openNew: (options) => setState({ open: true, transaction: null, type: options?.type ?? 'EXPENSE' }),
      openEdit: (transaction) => setState({ open: true, transaction, type: transaction.type }),
    }),
    [],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isNewTransactionShortcut(e)) return;
      e.preventDefault();
      // Already open (add or edit): leave it alone.
      setState((prev) => (prev.open ? prev : { open: true, transaction: null, type: 'EXPENSE' }));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <TransactionDialogContext.Provider value={value}>
      {children}
      <TransactionFormDialog
        open={state.open}
        onOpenChange={(open) => setState((prev) => ({ ...prev, open }))}
        transaction={state.transaction}
        defaultType={state.type}
      />
    </TransactionDialogContext.Provider>
  );
}
