import type { CategoryRef, NewTransaction, TransactionPatch, TransactionState } from './transaction';

/** Write-side port. Every method is scoped by householdId. */
export abstract class TransactionRepository {
  abstract findById(householdId: string, transactionId: string): Promise<TransactionState | null>;
  /** The category if it belongs to this household, else null. */
  abstract findCategory(householdId: string, categoryId: string): Promise<CategoryRef | null>;
  abstract isMember(householdId: string, userId: string): Promise<boolean>;
  abstract householdCurrency(householdId: string): Promise<string>;
  /** Returns the new id. */
  abstract create(transaction: NewTransaction): Promise<string>;
  abstract update(householdId: string, transactionId: string, patch: TransactionPatch): Promise<void>;
  /** False if nothing was deleted (unknown id or other household). */
  abstract delete(householdId: string, transactionId: string): Promise<boolean>;
}
