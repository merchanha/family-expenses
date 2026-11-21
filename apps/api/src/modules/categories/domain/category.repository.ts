import type { TransactionType } from '@tandem/shared';
import type { CategoryListFilter, CategoryPatch, CategoryRecord, NewCategory } from './category';

/** Every method is scoped by householdId: a category of another household is never visible. */
export abstract class CategoryRepository {
  abstract list(householdId: string, filter: CategoryListFilter): Promise<CategoryRecord[]>;
  abstract findById(householdId: string, categoryId: string): Promise<CategoryRecord | null>;
  /** Another ACTIVE category with this name (case-insensitive) and type, if any. */
  abstract existsActiveWithName(householdId: string, type: TransactionType, name: string, excludeId?: string): Promise<boolean>;
  abstract create(category: NewCategory): Promise<CategoryRecord>;
  abstract update(householdId: string, categoryId: string, patch: CategoryPatch): Promise<CategoryRecord>;
  /** Transactions + budgets referencing the category. */
  abstract countUsage(householdId: string, categoryId: string): Promise<number>;
  /** Hard delete. Returns false (and deletes nothing) if a row started referencing it meanwhile. */
  abstract deleteIfUnused(householdId: string, categoryId: string): Promise<boolean>;
}
