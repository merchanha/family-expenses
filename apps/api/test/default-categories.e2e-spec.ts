import { PrismaClient } from '@prisma/client';
import { DEFAULT_CATEGORIES } from '@tandem/shared';
import { seedDefaultCategories } from '../src/categories/default-categories';

/** Integration test against the real DB (docker-compose postgres on :5433). */
describe('seedDefaultCategories (e2e, real DB)', () => {
  const prisma = new PrismaClient();
  let householdId: string;

  beforeAll(async () => {
    const household = await prisma.household.create({ data: { name: `e2e-seed-${Date.now()}` } });
    householdId = household.id;
  });

  afterAll(async () => {
    // Categories cascade on household delete.
    if (householdId) await prisma.household.delete({ where: { id: householdId } });
    await prisma.$disconnect();
  });

  it('creates the full default template on first run', async () => {
    const created = await seedDefaultCategories(prisma, householdId);
    expect(created).toBe(DEFAULT_CATEGORIES.length);

    const rows = await prisma.category.findMany({ where: { householdId } });
    expect(rows).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(rows.every((c) => c.isDefault && c.isActive)).toBe(true);
    expect(rows.filter((c) => c.type === 'EXPENSE')).toHaveLength(
      DEFAULT_CATEGORIES.filter((c) => c.type === 'EXPENSE').length,
    );
    expect(rows.filter((c) => c.type === 'INCOME')).toHaveLength(
      DEFAULT_CATEGORIES.filter((c) => c.type === 'INCOME').length,
    );
  });

  it('is idempotent on a second run', async () => {
    const created = await seedDefaultCategories(prisma, householdId);
    expect(created).toBe(0);
    expect(await prisma.category.count({ where: { householdId } })).toBe(DEFAULT_CATEGORIES.length);
  });

  it('only fills in missing defaults', async () => {
    await prisma.category.deleteMany({ where: { householdId, name: 'Salary', type: 'INCOME' } });
    expect(await seedDefaultCategories(prisma, householdId)).toBe(1);
    expect(await prisma.category.count({ where: { householdId } })).toBe(DEFAULT_CATEGORIES.length);
  });
});

/** P1-015 (FOR-101): unique ACTIVE category name per household + type, case-insensitive. */
describe('Category unique active name (e2e, real DB)', () => {
  const prisma = new PrismaClient();
  let householdId: string;
  let otherHouseholdId: string;

  beforeAll(async () => {
    householdId = (await prisma.household.create({ data: { name: `e2e-uniq-${Date.now()}` } })).id;
    otherHouseholdId = (await prisma.household.create({ data: { name: `e2e-uniq-other-${Date.now()}` } })).id;
  });
  afterAll(async () => {
    await prisma.household.deleteMany({ where: { id: { in: [householdId, otherHouseholdId] } } });
    await prisma.$disconnect();
  });

  const add = (name: string, type: 'INCOME' | 'EXPENSE' = 'EXPENSE', hid = householdId, isActive = true) =>
    prisma.category.create({ data: { householdId: hid, name, type, isActive } });
  const uniqueViolation = expect.objectContaining({ code: 'P2002' });

  it('rejects an exact duplicate and a different-case duplicate', async () => {
    await add('Pets');
    await expect(add('Pets')).rejects.toEqual(uniqueViolation);
    await expect(add('pETS')).rejects.toEqual(uniqueViolation);
  });

  it('allows the same name with another type or in another household', async () => {
    await expect(add('Pets', 'INCOME')).resolves.toBeDefined();
    await expect(add('Pets', 'EXPENSE', otherHouseholdId)).resolves.toBeDefined();
  });

  it('allows reuse after deactivation, and renaming into a duplicate fails', async () => {
    const old = await add('Gym');
    await prisma.category.update({ where: { id: old.id }, data: { isActive: false } });
    const fresh = await add('gym');
    await expect(prisma.category.update({ where: { id: old.id }, data: { isActive: true } })).rejects.toEqual(uniqueViolation);
    const other = await add('Yoga');
    await expect(prisma.category.update({ where: { id: other.id }, data: { name: 'GYM' } })).rejects.toEqual(uniqueViolation);
    expect(fresh.isActive).toBe(true);
  });

  it('seeding stays idempotent next to case-variant names', async () => {
    await add('salary', 'INCOME');
    await expect(seedDefaultCategories(prisma, householdId)).resolves.toBe(DEFAULT_CATEGORIES.length - 1);
    await expect(seedDefaultCategories(prisma, householdId)).resolves.toBe(0);
  });
});
