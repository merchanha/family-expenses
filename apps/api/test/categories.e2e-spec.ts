import request from 'supertest';
import { categoryListResponseSchema, categorySchema, DEFAULT_CATEGORIES, deleteCategoryResponseSchema } from '@tandem/shared';
import { bearer, categoryId, createE2eApp, createHousehold, createTx, E2eContext, registerUser, TestUser } from './helpers';

describe('Categories (e2e)', () => {
  let ctx: E2eContext;
  let ana: TestUser, carla: TestUser, dan: TestUser;

  beforeAll(async () => {
    ctx = await createE2eApp('cat');
    [ana, carla, dan] = await Promise.all(['ana', 'carla', 'dan'].map((l) => registerUser(ctx, l)));
    await createHousehold(ctx, ana, 'A');
    await createHousehold(ctx, carla, 'B');
  });
  afterAll(() => ctx.close());

  const api = (u: TestUser) => ({
    get: (p: string) => request(ctx.http).get(p).set(bearer(u.accessToken)),
    post: (p: string, b: object) => request(ctx.http).post(p).set(bearer(u.accessToken)).send(b),
    patch: (p: string, b: object) => request(ctx.http).patch(p).set(bearer(u.accessToken)).send(b),
    del: (p: string) => request(ctx.http).delete(p).set(bearer(u.accessToken)),
  });

  it('P2-001: a new household has the default categories', async () => {
    const res = categoryListResponseSchema.parse((await api(ana).get('/api/categories').expect(200)).body);
    expect(res.items).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(res.items.every((c) => c.isDefault && c.isActive && c.transactionCount === 0)).toBe(true);
    // EXPENSE first, then INCOME
    expect(res.items[0].type).toBe('EXPENSE');
    expect(res.items[res.items.length - 1].type).toBe('INCOME');
    const income = (await api(ana).get('/api/categories?type=INCOME').expect(200)).body.items as { type: string }[];
    expect(income.every((c) => c.type === 'INCOME')).toBe(true);
  });

  it('requires auth and a household', async () => {
    await request(ctx.http).get('/api/categories').expect(401);
    expect((await api(dan).get('/api/categories').expect(403)).body.error).toBe('HOUSEHOLD_REQUIRED');
  });

  it('creates, validates and rejects duplicate active names', async () => {
    const res = await api(ana).post('/api/categories', { name: 'Pets', type: 'EXPENSE', icon: 'pets', color: '#112233' }).expect(201);
    expect(categorySchema.parse(res.body)).toMatchObject({ name: 'Pets', icon: 'pets', color: '#112233', isDefault: false, isActive: true });
    expect((await api(ana).post('/api/categories', { name: 'PETS', type: 'EXPENSE' }).expect(409)).body.error).toBe('CATEGORY_NAME_TAKEN');
    await api(ana).post('/api/categories', { name: 'Pets', type: 'INCOME' }).expect(201);
    const bad = await api(ana).post('/api/categories', { name: '', type: 'NOPE', color: 'red' }).expect(400);
    expect(bad.body.issues.map((i: { path: string }) => i.path).sort()).toEqual(['color', 'name', 'type']);
  });

  it('updates fields; type is not editable', async () => {
    const id = (await api(ana).post('/api/categories', { name: 'Hobbies', type: 'EXPENSE' }).expect(201)).body.id;
    const res = await api(ana).patch(`/api/categories/${id}`, { name: 'Hobbies & Crafts', icon: 'palette', description: 'Fun' }).expect(200);
    expect(res.body).toMatchObject({ name: 'Hobbies & Crafts', icon: 'palette', description: 'Fun', type: 'EXPENSE' });
    await api(ana).patch(`/api/categories/${id}`, { type: 'INCOME' }).expect(400); // no editable field given
    expect((await api(ana).patch(`/api/categories/${id}`, { type: 'INCOME', name: 'H2' }).expect(200)).body.type).toBe('EXPENSE');
    await api(ana).patch(`/api/categories/${id}`, { icon: null }).expect(200);
    expect((await api(ana).patch(`/api/categories/${id}`, { name: 'Shopping' }).expect(409)).body.error).toBe('CATEGORY_NAME_TAKEN');
  });

  it('DELETE hard-deletes an unused category', async () => {
    const id = (await api(ana).post('/api/categories', { name: 'Temp', type: 'EXPENSE' }).expect(201)).body.id;
    expect(deleteCategoryResponseSchema.parse((await api(ana).del(`/api/categories/${id}`).expect(200)).body)).toEqual({
      result: 'DELETED',
      category: null,
    });
    expect(await ctx.prisma.category.findUnique({ where: { id } })).toBeNull();
    await api(ana).del(`/api/categories/${id}`).expect(404);
  });

  it('DELETE deactivates a used category and history keeps it', async () => {
    const id = (await api(ana).post('/api/categories', { name: 'Gym', type: 'EXPENSE' }).expect(201)).body.id;
    const txId = await createTx(ctx, ana, { type: 'EXPENSE', description: 'Monthly', amount: '100.00', categoryId: id, transactionDate: '2026-11-02' });
    const res = deleteCategoryResponseSchema.parse((await api(ana).del(`/api/categories/${id}`).expect(200)).body);
    expect(res.result).toBe('DEACTIVATED');
    expect(res.category).toMatchObject({ id, isActive: false, transactionCount: 1 });
    // Hidden from the default list, visible with includeInactive.
    const active = (await api(ana).get('/api/categories').expect(200)).body.items as { id: string }[];
    expect(active.some((c) => c.id === id)).toBe(false);
    const all = (await api(ana).get('/api/categories?includeInactive=true').expect(200)).body.items as { id: string }[];
    expect(all.some((c) => c.id === id)).toBe(true);
    // The transaction still has its category.
    expect((await api(ana).get(`/api/transactions/${txId}`).expect(200)).body.category).toMatchObject({ id, isActive: false });
    // New transactions cannot use it.
    const r = await api(ana).post('/api/transactions', { type: 'EXPENSE', description: 'x', amount: '1', categoryId: id, transactionDate: '2026-11-03' });
    expect(r.status).toBe(422);
    expect(r.body.error).toBe('CATEGORY_INACTIVE');
    // Name can be reused; reactivating the old one now conflicts.
    await api(ana).post('/api/categories', { name: 'gym', type: 'EXPENSE' }).expect(201);
    expect((await api(ana).patch(`/api/categories/${id}`, { isActive: true }).expect(409)).body.error).toBe('CATEGORY_NAME_TAKEN');
  });

  describe('household isolation', () => {
    let anaCategory: string;
    beforeAll(async () => {
      anaCategory = await categoryId(ctx, ana, 'EXPENSE', 'Travel');
    });

    it('GET /categories lists only the caller household', async () => {
      const a = new Set(((await api(ana).get('/api/categories?includeInactive=true')).body.items as { id: string }[]).map((c) => c.id));
      const b = ((await api(carla).get('/api/categories?includeInactive=true')).body.items as { id: string }[]).map((c) => c.id);
      expect(b.some((id) => a.has(id))).toBe(false);
      expect((await api(carla).get('/api/categories').expect(200)).body.items.some((c: { name: string }) => c.name === 'Pets')).toBe(false);
    });

    it('POST /categories creates in the caller household, ignoring a client householdId', async () => {
      const householdA = (await ctx.prisma.category.findUniqueOrThrow({ where: { id: anaCategory } })).householdId;
      const res = await api(carla).post('/api/categories', { name: 'Carla Only', type: 'EXPENSE', householdId: householdA }).expect(201);
      expect((await ctx.prisma.category.findUniqueOrThrow({ where: { id: res.body.id } })).householdId).not.toBe(householdA);
    });

    it('PATCH /categories/:id of another household → 404, unchanged', async () => {
      expect((await api(carla).patch(`/api/categories/${anaCategory}`, { name: 'Hacked' }).expect(404)).body.error).toBe('CATEGORY_NOT_FOUND');
      expect((await ctx.prisma.category.findUniqueOrThrow({ where: { id: anaCategory } })).name).toBe('Travel');
    });

    it('DELETE /categories/:id of another household → 404, still there and active', async () => {
      await api(carla).del(`/api/categories/${anaCategory}`).expect(404);
      expect((await ctx.prisma.category.findUniqueOrThrow({ where: { id: anaCategory } })).isActive).toBe(true);
    });
  });
});
