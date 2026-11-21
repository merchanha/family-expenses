import type { BudgetCategoryRef, BudgetPatch, BudgetRecord, NewBudget, YearMonth } from './budget';

/** Write-side port. Every method is scoped by householdId. */
export abstract class BudgetRepository {
  /** The category if it belongs to this household, else null. */
  abstract findCategory(householdId: string, categoryId: string): Promise<BudgetCategoryRef | null>;
  abstract findByCategoryMonth(householdId: string, categoryId: string, period: YearMonth): Promise<BudgetRecord | null>;
  abstract householdCurrency(householdId: string): Promise<string>;
  abstract create(budget: NewBudget): Promise<BudgetRecord>;
  abstract update(householdId: string, budgetId: string, patch: BudgetPatch): Promise<BudgetRecord>;
  /** False if nothing was deleted (unknown id or other household). */
  abstract delete(householdId: string, budgetId: string): Promise<boolean>;
  /** Budgets of a month, with their category's state. */
  abstract listForMonth(householdId: string, period: YearMonth): Promise<(BudgetRecord & { category: BudgetCategoryRef })[]>;
  /** Inserts, skipping any (category, month) that already has a budget. Returns how many were created. */
  abstract createMany(budgets: NewBudget[]): Promise<number>;
}
