import request from 'supertest';
import { budgetSchema, budgetUtilizationResponseSchema, type BudgetUtilizationResponse } from '@tandem/shared';
import { acceptInvite, bearer, categoryId, createE2eApp, createHousehold, createTx, E2eContext, invite, registerUser, TestUser } from './helpers';

describe('Budgets (e2e)', () => {
  let ctx: E2eContext;
  let ana: TestUser, bruno: TestUser, carla: TestUser;
  let groceries: string, rent: string, salary: string, carlaGroceries: string;

  const put = (u: TestUser, body: object) => request(ctx.http).put('/api/budgets').set(bearer(u.accessToken)).send(body);
  const utilization = async (u: TestUser, qs: string): Promise<BudgetUtilizationResponse> =>
    budgetUtilizationResponseSchema.parse(
      (await request(ctx.http).get(`/api/budgets/utilization${qs}`).set(bearer(u.accessToken)).expect(200)).body,
    );
  const row = (r: BudgetUtilizationResponse, id: string) => r.items.find((i) => i.category.id === id);

  beforeAll(async () => {
    ctx = await createE2eApp('bud');
    [ana, bruno, carla] = await Promise.all(['ana', 'bruno', 'carla'].map((l) => registerUser(ctx, l)));
    await createHousehold(ctx, ana, 'A');
    await createHousehold(ctx, carla, 'B');
    await acceptInvite(ctx, bruno, (await invite(ctx, ana, bruno.email)).token);
    groceries = await categoryId(ctx, ana, 'EXPENSE', 'Groceries & Food');
    rent = await categoryId(ctx, ana, 'EXPENSE', 'Rent & Housing');
    salary = await categoryId(ctx, ana, 'INCOME', 'Salary');
    carlaGroceries = await categoryId(ctx, carla, 'EXPENSE', 'Groceries & Food');
    const exp = (u: TestUser, amount: string, date: string, paidById: string | null, cat = groceries) =>
      createTx(ctx, u, { type: 'EXPENSE', description: `exp ${amount}`, amount, categoryId: cat, transactionDate: date, paidById });
    // March 2025 groceries: 250 (ana) + 150.10 (bruno) + 50 (shared) = 450.10. Rent 1000 (shared).
    await exp(ana, '250.00', '2025-03-02', ana.id);
    await exp(bruno, '150.10', '2025-03-15', bruno.id);
    await exp(ana, '50.00', '2025-03-31', null);
    await exp(ana, '1000.00', '2025-03-01', null, rent);
    // Outside March
    await exp(ana, '999.00', '2025-04-01', ana.id);
    // Carla's household spends in March too (must never leak).
    await createTx(ctx, carla, { type: 'EXPENSE', description: 'b', amount: '777.00', categoryId: carlaGroceries, transactionDate: '2025-03-10' });
  });
  afterAll(() => ctx.close());

  it('upserts one budget per category/month (P3-001)', async () => {
    const a = budgetSchema.parse((await put(ana, { categoryId: groceries, year: 2025, month: 3, amount: '500', splitPartner1Percent: 60 }).expect(200)).body);
    expect(a).toMatchObject({ categoryId: groceries, year: 2025, month: 3, amount: '500.00', currency: 'ARS', splitPartner1Percent: 60 });
    // Partner edits the same envelope: same id, amount changed, split kept.
    const b = budgetSchema.parse((await put(bruno, { categoryId: groceries, year: 2025, month: 3, amount: '562.63' }).expect(200)).body);
    expect(b).toMatchObject({ id: a.id, amount: '562.63', splitPartner1Percent: 60 });
    expect(await ctx.prisma.budget.count({ where: { categoryId: groceries } })).toBe(1);
  });

  it('validates input and business rules', async () => {
    await put(ana, { categoryId: groceries, year: 2025, month: 3, amount: '0' }).expect(400);
    await put(ana, { categoryId: groceries, year: 2025, month: 13, amount: '1' }).expect(400);
    await put(ana, { categoryId: groceries, year: 2025, month: 3, amount: 10 }).expect(400);
    await put(ana, { categoryId: groceries, year: 2025, month: 3, amount: '1', splitPartner1Percent: 101 }).expect(400);
    expect((await put(ana, { categoryId: salary, year: 2025, month: 3, amount: '1' }).expect(422)).body.error).toBe('BUDGET_CATEGORY_NOT_EXPENSE');
    expect((await put(ana, { categoryId: 'nope', year: 2025, month: 3, amount: '1' }).expect(404)).body.error).toBe('CATEGORY_NOT_FOUND');
  });

  it('computes utilization, status bands and paid-by breakdown (P3-002)', async () => {
    const r = await utilization(ana, '?year=2025&month=3');
    expect(r.period).toEqual({ from: '2025-03-01', to: '2025-03-31', year: 2025, month: 3 });
    expect(r.defaultSplitPartner1Percent).toBe(50);
    // 450.10 / 562.63 × 100 = 79.9993… → 80.00 → APPROACHING (rounded value decides the band)
    expect(row(r, groceries)).toMatchObject({
      budget: { amount: '562.63', splitPartner1Percent: 60 },
      spent: '450.10',
      remaining: '112.53',
      utilization: '80.00',
      status: 'APPROACHING',
      paidBy: { partner1: '250.00', partner2: '150.10', shared: '50.00' },
    });
    // No budget: still listed with spent, nulls elsewhere.
    expect(row(r, rent)).toMatchObject({ budget: null, spent: '1000.00', remaining: null, utilization: null, status: null });
    // Every active expense category is listed; no income categories.
    expect(r.items.every((i) => i.category.type === 'EXPENSE')).toBe(true);
    expect(r.items.length).toBeGreaterThanOrEqual(12);
    // Summary counts only budgeted categories.
    expect(r.summary).toEqual({ monthlyAllocation: '562.63', consumed: '450.10', consumedPercent: '80.00', status: 'APPROACHING', remaining: '112.53', budgetCount: 1 });
  });

  it('applies the partner filter to spent and utilization (Shared excluded)', async () => {
    const p1 = await utilization(ana, '?year=2025&month=3&partner=PARTNER_1');
    expect(p1.partner).toBe('PARTNER_1');
    expect(row(p1, groceries)).toMatchObject({ spent: '250.00', utilization: '44.43', status: 'WITHIN', paidBy: { partner1: '250.00', partner2: '0.00', shared: '0.00' } });
    expect(row(p1, rent)?.spent).toBe('0.00');
    const p2 = await utilization(ana, '?year=2025&month=3&partner=PARTNER_2');
    expect(row(p2, groceries)).toMatchObject({ spent: '150.10', utilization: '26.68' });
  });

  it('hits EXCEEDED at exactly 100% and keeps transactions untouched', async () => {
    await put(ana, { categoryId: rent, year: 2025, month: 3, amount: '1000.00' }).expect(200);
    const r = await utilization(ana, '?year=2025&month=3');
    expect(row(r, rent)).toMatchObject({ utilization: '100.00', status: 'EXCEEDED', remaining: '0.00' });
    expect(r.summary).toMatchObject({ monthlyAllocation: '1562.63', consumed: '1450.10', consumedPercent: '92.80', budgetCount: 2 });
    const tx = await ctx.prisma.transaction.findMany({ where: { categoryId: rent } });
    expect(tx.map((t) => t.amount.toFixed(2))).toEqual(['1000.00']);
  });

  it('inactive category: listed when it has a budget, existing budget editable, new one 422', async () => {
    const res = await request(ctx.http).post('/api/categories').set(bearer(ana.accessToken)).send({ name: `Pets ${ctx.prefix}`, type: 'EXPENSE' }).expect(201);
    const pets = res.body.id as string;
    await put(ana, { categoryId: pets, year: 2025, month: 3, amount: '100.00' }).expect(200);
    // Used by a budget → DELETE deactivates instead of deleting.
    expect((await request(ctx.http).delete(`/api/categories/${pets}`).set(bearer(ana.accessToken)).expect(200)).body.result).toBe('DEACTIVATED');
    await put(ana, { categoryId: pets, year: 2025, month: 3, amount: '120.00' }).expect(200);
    expect((await put(ana, { categoryId: pets, year: 2025, month: 4, amount: '1' }).expect(422)).body.error).toBe('CATEGORY_INACTIVE');
    const r = await utilization(ana, '?year=2025&month=3');
    expect(row(r, pets)).toMatchObject({ category: { isActive: false }, budget: { amount: '120.00' } });
    // A month where it has no budget and no spend: hidden.
    expect(row(await utilization(ana, '?year=2025&month=5'), pets)).toBeUndefined();
  });

  it('copies last month without overwriting (decision #18)', async () => {
    await put(ana, { categoryId: groceries, year: 2025, month: 4, amount: '700.00' }).expect(200);
    const res = await request(ctx.http).post('/api/budgets/copy-previous-month').set(bearer(ana.accessToken)).send({ year: 2025, month: 4 }).expect(200);
    // From March: groceries (already budgeted in April → skipped), rent (copied), pets (inactive → skipped).
    expect(res.body).toEqual({ created: 1 });
    const april = await utilization(ana, '?year=2025&month=4');
    expect(row(april, groceries)?.budget?.amount).toBe('700.00');
    expect(row(april, rent)?.budget?.amount).toBe('1000.00');
    expect((await request(ctx.http).post('/api/budgets/copy-previous-month').set(bearer(ana.accessToken)).send({ year: 2025, month: 4 }).expect(200)).body).toEqual({ created: 0 });
    await request(ctx.http).post('/api/budgets/copy-previous-month').set(bearer(ana.accessToken)).send({ year: 2025 }).expect(400);
  });

  it('deletes a budget for good', async () => {
    const b = budgetSchema.parse((await put(ana, { categoryId: groceries, year: 2025, month: 6, amount: '1.00' }).expect(200)).body);
    await request(ctx.http).delete(`/api/budgets/${b.id}`).set(bearer(ana.accessToken)).expect(204);
    expect((await request(ctx.http).delete(`/api/budgets/${b.id}`).set(bearer(ana.accessToken)).expect(404)).body.error).toBe('BUDGET_NOT_FOUND');
  });

  it('defaults to the current month and validates the query', async () => {
    const r = await utilization(ana, '');
    expect(r.period.year).not.toBeNull();
    await request(ctx.http).get('/api/budgets/utilization?year=2025').set(bearer(ana.accessToken)).expect(400);
    await request(ctx.http).get('/api/budgets/utilization?year=2025&month=3&partner=BOTH').set(bearer(ana.accessToken)).expect(400);
  });

  it('requires authentication', async () => {
    await request(ctx.http).get('/api/budgets/utilization').expect(401);
    await request(ctx.http).put('/api/budgets').send({}).expect(401);
  });

  describe('household isolation', () => {
    it("cannot budget, read, copy or delete another household's budgets", async () => {
      const aBudget = await ctx.prisma.budget.findFirstOrThrow({ where: { categoryId: groceries, year: 2025, month: 3 } });
      // Carla targets A's category → 404, nothing created.
      expect((await put(carla, { categoryId: groceries, year: 2025, month: 3, amount: '1' }).expect(404)).body.error).toBe('CATEGORY_NOT_FOUND');
      // Carla deletes A's budget → 404, still there.
      await request(ctx.http).delete(`/api/budgets/${aBudget.id}`).set(bearer(carla.accessToken)).expect(404);
      expect(await ctx.prisma.budget.count({ where: { id: aBudget.id } })).toBe(1);
      // Carla's view: only her categories and spend, no A budgets.
      const b = await utilization(carla, '?year=2025&month=3');
      expect(b.items.some((i) => i.category.id === groceries)).toBe(false);
      expect(b.summary.budgetCount).toBe(0);
      expect(b.items.find((i) => i.category.id === carlaGroceries)?.spent).toBe('777.00');
      // A's view excludes Carla's 777.
      expect(row(await utilization(ana, '?year=2025&month=3'), groceries)?.spent).toBe('450.10');
      // Copy only touches Carla's own budgets.
      expect((await request(ctx.http).post('/api/budgets/copy-previous-month').set(bearer(carla.accessToken)).send({ year: 2025, month: 4 }).expect(200)).body).toEqual({ created: 0 });
      // A budget on Carla's own category works and is invisible to A.
      const own = budgetSchema.parse((await put(carla, { categoryId: carlaGroceries, year: 2025, month: 3, amount: '800' }).expect(200)).body);
      await request(ctx.http).delete(`/api/budgets/${own.id}`).set(bearer(ana.accessToken)).expect(404);
      expect((await utilization(ana, '?year=2025&month=3')).summary.budgetCount).toBe(3);
    });
  });
});
