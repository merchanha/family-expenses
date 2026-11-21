import type { TransactionType } from '@tandem/shared';

/** What the write side needs to know about an existing transaction. */
export interface TransactionState {
  id: string;
  type: TransactionType;
  categoryId: string;
}

/** The category being assigned, as seen from the caller's household. */
export interface CategoryRef {
  id: string;
  type: TransactionType;
  isActive: boolean;
}

/** `amount` is a validated positive decimal string ("1234.50"); the repository stores it as Decimal. */
export interface NewTransaction {
  householdId: string;
  createdById: string;
  type: TransactionType;
  description: string;
  amount: string;
  currency: string;
  categoryId: string;
  transactionDate: string;
  paidById: string | null;
  paymentMethod: string | null;
  notes: string | null;
}

export type TransactionPatch = Partial<
  Pick<NewTransaction, 'type' | 'description' | 'amount' | 'categoryId' | 'transactionDate' | 'paidById' | 'paymentMethod' | 'notes'>
>;
