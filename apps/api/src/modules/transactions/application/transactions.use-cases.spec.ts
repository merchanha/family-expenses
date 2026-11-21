import type { CreateTransactionInput } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { InMemoryTransactionRepository } from '../__tests__/fakes';
import {
  CategoryInactiveError,
  CategoryTypeMismatchError,
  InvalidCategoryError,
  PaidByNotMemberError,
  TransactionNotFoundError,
} from '../domain/transaction.errors';
import { CreateTransactionUseCase } from './create-transaction.use-case';
import { DeleteTransactionUseCase } from './delete-transaction.use-case';
import { UpdateTransactionUseCase } from './update-transaction.use-case';

const A: HouseholdContext = { userId: 'ana', householdId: 'hh_a', partnerSlot: 'PARTNER_1', role: 'OWNER' };
const B: HouseholdContext = { userId: 'carla', householdId: 'hh_b', partnerSlot: 'PARTNER_1', role: 'OWNER' };

function setup() {
  const repo = new InMemoryTransactionRepository();
  repo.categories.push(
    { id: 'groceries', householdId: 'hh_a', type: 'EXPENSE', isActive: true },
    { id: 'salary', householdId: 'hh_a', type: 'INCOME', isActive: true },
    { id: 'old', householdId: 'hh_a', type: 'EXPENSE', isActive: false },
    { id: 'b_cat', householdId: 'hh_b', type: 'EXPENSE', isActive: true },
  );
  repo.members.push({ householdId: 'hh_a', userId: 'ana' }, { householdId: 'hh_a', userId: 'bruno' }, { householdId: 'hh_b', userId: 'carla' });
  return {
    repo,
    create: new CreateTransactionUseCase(repo),
    update: new UpdateTransactionUseCase(repo),
    remove: new DeleteTransactionUseCase(repo),
  };
}

const expense = (over: Partial<CreateTransactionInput> = {}): CreateTransactionInput => ({
  type: 'EXPENSE',
  description: 'Supermarket',
  amount: '1234.50',
  categoryId: 'groceries',
  transactionDate: '2026-11-20',
  ...over,
});

describe('transactions use cases', () => {
  it('creates with createdBy = caller, paidBy, household currency', async () => {
    const t = setup();
    const id = await t.create.execute(A, expense({ paidById: 'bruno' }));
    expect(t.repo.rows.find((r) => r.id === id)).toMatchObject({
      householdId: 'hh_a',
      createdById: 'ana',
      paidById: 'bruno',
      amount: '1234.50',
      currency: 'ARS',
      paymentMethod: null,
      notes: null,
    });
  });

  it('paidBy omitted or null = Shared', async () => {
    const t = setup();
    const id = await t.create.execute(A, expense({ paidById: null }));
    expect(t.repo.rows.find((r) => r.id === id)?.paidById).toBeNull();
  });

  it('rejects category type mismatch (P2-014)', async () => {
    const t = setup();
    await expect(t.create.execute(A, expense({ categoryId: 'salary' }))).rejects.toBeInstanceOf(CategoryTypeMismatchError);
    await expect(t.create.execute(A, expense({ type: 'INCOME' }))).rejects.toBeInstanceOf(CategoryTypeMismatchError);
  });

  it('rejects unknown, foreign or inactive categories', async () => {
    const t = setup();
    await expect(t.create.execute(A, expense({ categoryId: 'nope' }))).rejects.toBeInstanceOf(InvalidCategoryError);
    await expect(t.create.execute(A, expense({ categoryId: 'b_cat' }))).rejects.toBeInstanceOf(InvalidCategoryError);
    await expect(t.create.execute(A, expense({ categoryId: 'old' }))).rejects.toBeInstanceOf(CategoryInactiveError);
    expect(t.repo.rows).toHaveLength(0);
  });

  it('rejects paidBy who is not a household member', async () => {
    const t = setup();
    await expect(t.create.execute(A, expense({ paidById: 'carla' }))).rejects.toBeInstanceOf(PaidByNotMemberError);
  });

  it('update validates the resulting type/category pair', async () => {
    const t = setup();
    const id = await t.create.execute(A, expense());
    await expect(t.update.execute(A, id, { type: 'INCOME' })).rejects.toBeInstanceOf(CategoryTypeMismatchError);
    await t.update.execute(A, id, { type: 'INCOME', categoryId: 'salary', amount: '10.00' });
    expect(t.repo.rows[0]).toMatchObject({ type: 'INCOME', categoryId: 'salary', amount: '10.00' });
  });

  it('update may keep an inactive category but not switch to one', async () => {
    const t = setup();
    const id = await t.create.execute(A, expense());
    t.repo.categories.find((c) => c.id === 'groceries')!.isActive = false;
    await expect(t.update.execute(A, id, { amount: '5.00' })).resolves.toBeUndefined();
    await expect(t.update.execute(A, id, { categoryId: 'groceries', description: 'x' })).resolves.toBeUndefined();
    t.repo.categories.find((c) => c.id === 'groceries')!.isActive = true;
    await expect(t.update.execute(A, id, { categoryId: 'old' })).rejects.toBeInstanceOf(CategoryInactiveError);
  });

  it('update checks paidBy membership and allows clearing it', async () => {
    const t = setup();
    const id = await t.create.execute(A, expense({ paidById: 'bruno' }));
    await expect(t.update.execute(A, id, { paidById: 'carla' })).rejects.toBeInstanceOf(PaidByNotMemberError);
    await t.update.execute(A, id, { paidById: null });
    expect(t.repo.rows[0].paidById).toBeNull();
  });

  it('another household transaction is not found for update/delete', async () => {
    const t = setup();
    const id = await t.create.execute(A, expense());
    await expect(t.update.execute(B, id, { amount: '1.00' })).rejects.toBeInstanceOf(TransactionNotFoundError);
    await expect(t.remove.execute(B, id)).rejects.toBeInstanceOf(TransactionNotFoundError);
    expect(t.repo.rows[0].amount).toBe('1234.50');
  });

  it('deletes', async () => {
    const t = setup();
    const id = await t.create.execute(A, expense());
    await t.remove.execute(A, id);
    expect(t.repo.rows).toHaveLength(0);
    await expect(t.remove.execute(A, id)).rejects.toBeInstanceOf(TransactionNotFoundError);
  });
});
