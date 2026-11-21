import type { HouseholdContext } from '../../../common/auth/auth-context';
import { InMemoryCategoryRepository } from '../__tests__/fakes';
import { CategoryNameTakenError, CategoryNotFoundError } from '../domain/category.errors';
import { CreateCategoryUseCase } from './create-category.use-case';
import { DeleteCategoryUseCase } from './delete-category.use-case';
import { ListCategoriesQuery } from './list-categories.query';
import { UpdateCategoryUseCase } from './update-category.use-case';

const A: HouseholdContext = { userId: 'u_a', householdId: 'hh_a', partnerSlot: 'PARTNER_1', role: 'OWNER' };
const B: HouseholdContext = { userId: 'u_b', householdId: 'hh_b', partnerSlot: 'PARTNER_1', role: 'OWNER' };

function setup() {
  const repo = new InMemoryCategoryRepository();
  return {
    repo,
    create: new CreateCategoryUseCase(repo),
    update: new UpdateCategoryUseCase(repo),
    remove: new DeleteCategoryUseCase(repo),
    list: new ListCategoriesQuery(repo),
  };
}

describe('categories use cases', () => {
  it('creates a category with optional fields defaulting to null', async () => {
    const t = setup();
    const c = await t.create.execute(A, { name: 'Pets', type: 'EXPENSE' });
    expect(c).toMatchObject({ householdId: 'hh_a', name: 'Pets', icon: null, color: null, description: null, isActive: true });
  });

  it('rejects a duplicate active name of the same type, case-insensitively', async () => {
    const t = setup();
    await t.create.execute(A, { name: 'Pets', type: 'EXPENSE' });
    await expect(t.create.execute(A, { name: 'pets', type: 'EXPENSE' })).rejects.toBeInstanceOf(CategoryNameTakenError);
    await expect(t.create.execute(A, { name: 'Pets', type: 'INCOME' })).resolves.toBeDefined();
    await expect(t.create.execute(B, { name: 'Pets', type: 'EXPENSE' })).resolves.toBeDefined();
  });

  it('updates fields, and rename into a taken name is a conflict', async () => {
    const t = setup();
    const pets = await t.create.execute(A, { name: 'Pets', type: 'EXPENSE' });
    await t.create.execute(A, { name: 'Gym', type: 'EXPENSE' });
    await expect(t.update.execute(A, pets.id, { name: 'GYM' })).rejects.toBeInstanceOf(CategoryNameTakenError);
    // Changing only case of its own name is fine.
    await expect(t.update.execute(A, pets.id, { name: 'PETS', icon: 'pets', color: null })).resolves.toMatchObject({ name: 'PETS', icon: 'pets' });
  });

  it('reactivating checks the name against active categories', async () => {
    const t = setup();
    const old = await t.create.execute(A, { name: 'Gym', type: 'EXPENSE' });
    await t.update.execute(A, old.id, { isActive: false });
    await t.create.execute(A, { name: 'gym', type: 'EXPENSE' });
    await expect(t.update.execute(A, old.id, { isActive: true })).rejects.toBeInstanceOf(CategoryNameTakenError);
  });

  it('another household category is not found', async () => {
    const t = setup();
    const c = await t.create.execute(A, { name: 'Pets', type: 'EXPENSE' });
    await expect(t.update.execute(B, c.id, { name: 'x' })).rejects.toBeInstanceOf(CategoryNotFoundError);
    await expect(t.remove.execute(B, c.id)).rejects.toBeInstanceOf(CategoryNotFoundError);
    expect(t.repo.rows).toHaveLength(1);
  });

  it('deletes an unused category', async () => {
    const t = setup();
    const c = await t.create.execute(A, { name: 'Pets', type: 'EXPENSE' });
    await expect(t.remove.execute(A, c.id)).resolves.toEqual({ result: 'DELETED', category: null });
    expect(t.repo.rows).toHaveLength(0);
  });

  it('deactivates (never deletes) a used category', async () => {
    const t = setup();
    const c = await t.create.execute(A, { name: 'Pets', type: 'EXPENSE' });
    t.repo.usage.set(c.id, 3);
    const res = await t.remove.execute(A, c.id);
    expect(res.result).toBe('DEACTIVATED');
    expect(res.category?.isActive).toBe(false);
    expect(t.repo.rows).toHaveLength(1);
  });

  it('falls back to deactivation if the category got used during delete', async () => {
    const t = setup();
    const c = await t.create.execute(A, { name: 'Pets', type: 'EXPENSE' });
    t.repo.raceOnDelete = true;
    expect((await t.remove.execute(A, c.id)).result).toBe('DEACTIVATED');
  });

  it('lists active by default, inactive on request, scoped to household', async () => {
    const t = setup();
    const a = await t.create.execute(A, { name: 'Pets', type: 'EXPENSE' });
    await t.create.execute(A, { name: 'Salary', type: 'INCOME' });
    await t.create.execute(B, { name: 'Other', type: 'EXPENSE' });
    await t.update.execute(A, a.id, { isActive: false });
    expect((await t.list.execute(A, {})).map((c) => c.name)).toEqual(['Salary']);
    expect((await t.list.execute(A, { includeInactive: true })).map((c) => c.name).sort()).toEqual(['Pets', 'Salary']);
    expect((await t.list.execute(A, { type: 'EXPENSE', includeInactive: true })).map((c) => c.name)).toEqual(['Pets']);
  });
});
