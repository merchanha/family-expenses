import type { TransactionType } from '@tandem/shared';
import type { CategoryListFilter, CategoryPatch, CategoryRecord, NewCategory } from '../domain/category';
import { CategoryRepository } from '../domain/category.repository';

let seq = 0;

export class InMemoryCategoryRepository extends CategoryRepository {
  readonly rows: CategoryRecord[] = [];
  /** categoryId → number of transactions/budgets using it. */
  readonly usage = new Map<string, number>();
  /** Simulates a transaction being added between countUsage and deleteIfUnused. */
  raceOnDelete = false;

  async list(householdId: string, filter: CategoryListFilter) {
    return this.rows.filter(
      (r) => r.householdId === householdId && (!filter.type || r.type === filter.type) && (filter.includeInactive || r.isActive),
    );
  }
  async findById(householdId: string, id: string) {
    return this.rows.find((r) => r.id === id && r.householdId === householdId) ?? null;
  }
  async existsActiveWithName(householdId: string, type: TransactionType, name: string, excludeId?: string) {
    return this.rows.some(
      (r) => r.householdId === householdId && r.type === type && r.isActive && r.id !== excludeId && r.name.toLowerCase() === name.toLowerCase(),
    );
  }
  async create(c: NewCategory) {
    const now = new Date();
    const row: CategoryRecord = { ...c, id: `cat_${++seq}`, isDefault: false, isActive: true, transactionCount: 0, createdAt: now, updatedAt: now };
    this.rows.push(row);
    return row;
  }
  async update(householdId: string, id: string, patch: CategoryPatch) {
    const row = (await this.findById(householdId, id))!;
    Object.assign(row, patch);
    return row;
  }
  async countUsage(_householdId: string, id: string) {
    return this.usage.get(id) ?? 0;
  }
  async deleteIfUnused(householdId: string, id: string) {
    if (this.raceOnDelete) return false;
    const i = this.rows.findIndex((r) => r.id === id && r.householdId === householdId);
    if (i < 0) return false;
    this.rows.splice(i, 1);
    return true;
  }
}
