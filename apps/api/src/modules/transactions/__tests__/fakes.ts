import type { CategoryRef, NewTransaction, TransactionPatch, TransactionState } from '../domain/transaction';
import { TransactionRepository } from '../domain/transaction.repository';

let seq = 0;

export class InMemoryTransactionRepository extends TransactionRepository {
  readonly rows: (NewTransaction & { id: string })[] = [];
  readonly categories: (CategoryRef & { householdId: string })[] = [];
  readonly members: { householdId: string; userId: string }[] = [];

  async findById(householdId: string, id: string): Promise<TransactionState | null> {
    const r = this.rows.find((t) => t.id === id && t.householdId === householdId);
    return r ? { id: r.id, type: r.type, categoryId: r.categoryId } : null;
  }
  async findCategory(householdId: string, categoryId: string) {
    const c = this.categories.find((x) => x.id === categoryId && x.householdId === householdId);
    return c ? { id: c.id, type: c.type, isActive: c.isActive } : null;
  }
  async isMember(householdId: string, userId: string) {
    return this.members.some((m) => m.householdId === householdId && m.userId === userId);
  }
  async householdCurrency() {
    return 'ARS';
  }
  async create(t: NewTransaction) {
    const id = `tx_${++seq}`;
    this.rows.push({ ...t, id });
    return id;
  }
  async update(householdId: string, id: string, patch: TransactionPatch) {
    const r = this.rows.find((t) => t.id === id && t.householdId === householdId);
    if (r) Object.assign(r, patch);
  }
  async delete(householdId: string, id: string) {
    const i = this.rows.findIndex((t) => t.id === id && t.householdId === householdId);
    if (i < 0) return false;
    this.rows.splice(i, 1);
    return true;
  }
}
