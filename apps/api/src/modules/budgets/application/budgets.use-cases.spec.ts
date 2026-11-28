import type { HouseholdContext } from '../../../common/auth/auth-context';
import { InMemoryBudgetRepository } from '../__tests__/fakes';
import {
  BudgetCategoryInactiveError,
  BudgetCategoryNotExpenseError,
  BudgetCategoryNotFoundError,
  BudgetNotFoundError,
} from '../domain/budget.errors';
import { CopyPreviousMonthBudgetsUseCase } from './copy-previous-month-budgets.use-case';
import { DeleteBudgetUseCase } from './delete-budget.use-case';
import { UpsertBudgetUseCase } from './upsert-budget.use-case';

const A: HouseholdContext = { userId: 'ana', householdId: 'hh_a', partnerSlot: 'PARTNER_1', role: 'OWNER' };
const B: HouseholdContext = { userId: 'carla', householdId: 'hh_b', partnerSlot: 'PARTNER_1', role: 'OWNER' };

function setup() {
  const repo = new InMemoryBudgetRepository();
  repo.categories.push(
    { id: 'groceries', householdId: 'hh_a', type: 'EXPENSE', isActive: true },
    { id: 'rent', householdId: 'hh_a', type: 'EXPENSE', isActive: true },
    { id: 'salary', householdId: 'hh_a', type: 'INCOME', isActive: true },
    { id: 'old', householdId: 'hh_a', type: 'EXPENSE', isActive: false },
    { id: 'b_cat', householdId: 'hh_b', type: 'EXPENSE', isActive: true },
  );
  return {
    repo,
    upsert: new UpsertBudgetUseCase(repo),
    remove: new DeleteBudgetUseCase(repo),
    copy: new CopyPreviousMonthBudgetsUseCase(repo),
  };
}

const nov = { year: 2026, month: 11 };

describe('budgets use cases', () => {
  it('creates, then updates the same category/month instead of duplicating', async () => {
    const t = setup();
    const created = await t.upsert.execute(A, { categoryId: 'groceries', ...nov, amount: '500.00', splitPartner1Percent: 60 });
    expect(created).toMatchObject({ householdId: 'hh_a', amount: '500.00', currency: 'ARS', splitPartner1Percent: 60 });
    const updated = await t.upsert.execute(A, { categoryId: 'groceries', ...nov, amount: '650.00' });
    expect(updated.id).toBe(created.id);
    // Omitted split keeps the stored value; null resets it to the household default.
    expect(updated).toMatchObject({ amount: '650.00', splitPartner1Percent: 60 });
    expect((await t.upsert.execute(A, { categoryId: 'groceries', ...nov, amount: '650.00', splitPartner1Percent: null })).splitPartner1Percent).toBeNull();
    expect(t.repo.rows).toHaveLength(1);
  });

  it('keeps one budget per month: other months are separate', async () => {
    const t = setup();
    await t.upsert.execute(A, { categoryId: 'groceries', ...nov, amount: '500.00' });
    await t.upsert.execute(A, { categoryId: 'groceries', year: 2026, month: 12, amount: '500.00' });
    expect(t.repo.rows).toHaveLength(2);
  });

  it('rejects income categories (422) and unknown/foreign categories (404)', async () => {
    const t = setup();
    await expect(t.upsert.execute(A, { categoryId: 'salary', ...nov, amount: '1.00' })).rejects.toBeInstanceOf(BudgetCategoryNotExpenseError);
    await expect(t.upsert.execute(A, { categoryId: 'nope', ...nov, amount: '1.00' })).rejects.toBeInstanceOf(BudgetCategoryNotFoundError);
    await expect(t.upsert.execute(A, { categoryId: 'b_cat', ...nov, amount: '1.00' })).rejects.toBeInstanceOf(BudgetCategoryNotFoundError);
    expect(t.repo.rows).toHaveLength(0);
  });

  it('inactive category: no new budget, but an existing one stays editable', async () => {
    const t = setup();
    await expect(t.upsert.execute(A, { categoryId: 'old', ...nov, amount: '1.00' })).rejects.toBeInstanceOf(BudgetCategoryInactiveError);
    await t.repo.create({ householdId: 'hh_a', categoryId: 'old', ...nov, amount: '100.00', currency: 'ARS', splitPartner1Percent: null });
    expect((await t.upsert.execute(A, { categoryId: 'old', ...nov, amount: '120.00' })).amount).toBe('120.00');
  });

  it('deletes only within the caller household', async () => {
    const t = setup();
    const b = await t.upsert.execute(A, { categoryId: 'groceries', ...nov, amount: '500.00' });
    await expect(t.remove.execute(B, b.id)).rejects.toBeInstanceOf(BudgetNotFoundError);
    await t.remove.execute(A, b.id);
    expect(t.repo.rows).toHaveLength(0);
    await expect(t.remove.execute(A, b.id)).rejects.toBeInstanceOf(BudgetNotFoundError);
  });

  it('copies last month for active expense categories, never overwriting', async () => {
    const t = setup();
    const oct = { year: 2026, month: 10 };
    await t.upsert.execute(A, { categoryId: 'groceries', ...oct, amount: '500.00', splitPartner1Percent: 70 });
    await t.upsert.execute(A, { categoryId: 'rent', ...oct, amount: '900.00' });
    await t.repo.create({ householdId: 'hh_a', categoryId: 'old', ...oct, amount: '50.00', currency: 'ARS', splitPartner1Percent: null });
    await t.upsert.execute(A, { categoryId: 'rent', ...nov, amount: '950.00' });

    expect(await t.copy.execute(A, nov)).toBe(1);
    const novRows = t.repo.rows.filter((b) => b.month === 11);
    expect(novRows.find((b) => b.categoryId === 'groceries')).toMatchObject({ amount: '500.00', splitPartner1Percent: 70 });
    expect(novRows.find((b) => b.categoryId === 'rent')?.amount).toBe('950.00'); // not overwritten
    expect(novRows.find((b) => b.categoryId === 'old')).toBeUndefined(); // inactive skipped
    expect(await t.copy.execute(A, nov)).toBe(0); // idempotent
  });

  it('copy crosses the year boundary and is household-scoped', async () => {
    const t = setup();
    await t.upsert.execute(A, { categoryId: 'groceries', year: 2026, month: 12, amount: '500.00' });
    expect(await t.copy.execute(B, { year: 2027, month: 1 })).toBe(0);
    expect(await t.copy.execute(A, { year: 2027, month: 1 })).toBe(1);
  });
});
