import type { TransactionType } from '@tandem/shared';
import type { CategoryRef } from './transaction';
import { CategoryInactiveError, CategoryTypeMismatchError, InvalidCategoryError } from './transaction.errors';

/**
 * BUSINESS_RULES §2/§3.7 (P2-014): a transaction's category must belong to the household and match
 * its type. A category must be active to be *assigned*; a transaction may keep an inactive category
 * it already had (history is preserved).
 */
export function assertCategoryAssignable(
  category: CategoryRef | null,
  type: TransactionType,
  opts: { newlyAssigned: boolean },
): void {
  if (!category) throw new InvalidCategoryError();
  if (opts.newlyAssigned && !category.isActive) throw new CategoryInactiveError();
  if (category.type !== type) throw new CategoryTypeMismatchError();
}
