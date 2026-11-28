import type { BudgetCategoryRef, BudgetPatch, BudgetRecord, NewBudget, YearMonth } from '../domain/budget';
import { BudgetRepository } from '../domain/budget.repository';

let seq = 0;

export class InMemoryBudgetRepository extends BudgetRepository {
  readonly rows: BudgetRecord[] = [];
  readonly categories: (BudgetCategoryRef & { householdId: string })[] = [];

  async findCategory(householdId: string, categoryId: string) {
    const c = this.categories.find((x) => x.id === categoryId && x.householdId === householdId);
    return c ? { id: c.id, type: c.type, isActive: c.isActive } : null;
  }
  async findByCategoryMonth(householdId: string, categoryId: string, p: YearMonth) {
    return this.rows.find((b) => b.householdId === householdId && b.categoryId === categoryId && b.year === p.year && b.month === p.month) ?? null;
  }
  async householdCurrency() {
    return 'ARS';
  }
  async create(b: NewBudget) {
    const now = new Date('2026-11-21T12:00:00Z');
    const row = { ...b, id: `b_${++seq}`, createdAt: now, updatedAt: now };
    this.rows.push(row);
    return row;
  }
  async update(householdId: string, id: string, patch: BudgetPatch) {
    const row = this.rows.find((b) => b.id === id && b.householdId === householdId);
    if (!row) throw new Error('not found');
    Object.assign(row, patch);
    return row;
  }
  async delete(householdId: string, id: string) {
    const i = this.rows.findIndex((b) => b.id === id && b.householdId === householdId);
    if (i < 0) return false;
    this.rows.splice(i, 1);
    return true;
  }
  async listForMonth(householdId: string, p: YearMonth) {
    return this.rows
      .filter((b) => b.householdId === householdId && b.year === p.year && b.month === p.month)
      .map((b) => {
        const c = this.categories.find((x) => x.id === b.categoryId)!;
        return { ...b, category: { id: c.id, type: c.type, isActive: c.isActive } };
      });
  }
  async createMany(budgets: NewBudget[]) {
    let n = 0;
    for (const b of budgets) {
      if (await this.findByCategoryMonth(b.householdId, b.categoryId, b)) continue;
      await this.create(b);
      n += 1;
    }
    return n;
  }
}
