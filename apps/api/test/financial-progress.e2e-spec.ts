import request from 'supertest';
import { financialProgressResponseSchema, type FinancialProgressResponse } from '@tandem/shared';
import { shiftMonth, todayInTimeZone } from '../src/common/period';
import { acceptInvite, bearer, categoryId, createE2eApp, createHousehold, createTx, E2eContext, invite, registerUser, TestUser } from './helpers';

describe('Financial Progress (e2e)', () => {
  let ctx: E2eContext;
  let ana: TestUser, bruno: TestUser, carla: TestUser;
  let groceries: string, travel: string, rent: string, salary: string;

  const progress = async (u: TestUser, qs: string): Promise<FinancialProgressResponse> =>
    financialProgressResponseSchema.parse(
      (await request(ctx.http).get(`/api/financial-progress/comparison${qs}`).set(bearer(u.accessToken)).expect(200)).body,
    );

  beforeAll(async () => {
    ctx = await createE2eApp('prog');
    [ana, bruno, carla] = await Promise.all(['ana', 'bruno', 'carla'].map((l) => registerUser(ctx, l)));
    await createHousehold(ctx, ana, 'A');
    await createHousehold(ctx, carla, 'B');
    await acceptInvite(ctx, bruno, (await invite(ctx, ana, bruno.email)).token);
    groceries = await categoryId(ctx, ana, 'EXPENSE', 'Groceries & Food');
    travel = await categoryId(ctx, ana, 'EXPENSE', 'Travel');
    rent = await categoryId(ctx, ana, 'EXPENSE', 'Rent & Housing');
    salary = await categoryId(ctx, ana, 'INCOME', 'Salary');
    const tx = (u: TestUser, type: 'INCOME' | 'EXPENSE', amount: string, date: string, cat: string, paidById: string | null) =>
      createTx(ctx, u, { type, description: `${type} ${amount}`, amount, categoryId: cat, transactionDate: date, paidById });
    // Jan 2025: income 900; expenses groceries 100
    await tx(ana, 'INCOME', '900.00', '2025-01-10', salary, ana.id);
    await tx(ana, 'EXPENSE', '100.00', '2025-01-11', groceries, ana.id);
    // Feb 2025: income 1000 (ana); groceries 300 (bruno), travel 200 (shared)
    await tx(ana, 'INCOME', '1000.00', '2025-02-01', salary, ana.id);
    await tx(bruno, 'EXPENSE', '300.00', '2025-02-10', groceries, bruno.id);
    await tx(ana, 'EXPENSE', '200.00', '2025-02-28', travel, null);
    // Mar 2025: income 1200 (bruno); groceries 360 (ana), rent 500 (bruno)
    await tx(bruno, 'INCOME', '1200.00', '2025-03-01', salary, bruno.id);
    await tx(ana, 'EXPENSE', '360.00', '2025-03-05', groceries, ana.id);
    await tx(bruno, 'EXPENSE', '500.00', '2025-03-31', rent, bruno.id);
    const carlaCat = await categoryId(ctx, carla, 'EXPENSE');
    await tx(carla, 'EXPENSE', '777.00', '2025-03-10', carlaCat, null);
  });
  afterAll(() => ctx.close());

  it('compares a past month full vs full (P3-004)', async () => {
    const p = await progress(ana, '?year=2025&month=3');
    expect(p).toMatchObject({
      year: 2025,
      month: 3,
      window: 'MOM',
      partner: null,
      currency: 'ARS',
      current: { from: '2025-03-01', to: '2025-03-31' },
      previous: { from: '2025-02-01', to: '2025-02-28' },
      isPartial: false,
    });
    expect(p.kpis).toEqual({
      totalSpending: { current: '860.00', previous: '500.00', changeAmount: '360.00', changePercent: '72.00' },
      householdIncome: { current: '1200.00', previous: '1000.00', changeAmount: '200.00', changePercent: '20.00' },
      netCashFlowBuffer: { current: '340.00', previous: '500.00', changeAmount: '-160.00', changePercent: '-32.00' },
      // 340/1200 = 28.33; 500/1000 = 50.00 → −21.67 pp
      savingsRate: { current: '28.33', previous: '50.00', changePoints: '-21.67' },
    });
  });

  it('returns the category variation matrix (null % when previous = 0)', async () => {
    const p = await progress(ana, '?year=2025&month=3');
    expect(p.categories.map((c) => [c.category.id, c.current, c.previous, c.varianceAmount, c.variancePercent])).toEqual([
      [rent, '500.00', '0.00', '500.00', null],
      [groceries, '360.00', '300.00', '60.00', '20.00'],
      [travel, '0.00', '200.00', '-200.00', '-100.00'],
    ]);
  });

  it('window sizes only the trend', async () => {
    const mom = await progress(ana, '?year=2025&month=3');
    expect(mom.trend.map((t) => [t.year, t.month, t.income, t.expenses, t.netCashFlowBuffer, t.isPartial])).toEqual([
      [2025, 2, '1000.00', '500.00', '500.00', false],
      [2025, 3, '1200.00', '860.00', '340.00', false],
    ]);
    const three = await progress(ana, '?year=2025&month=3&window=3M');
    expect(three.kpis).toEqual(mom.kpis);
    expect(three.trend.map((t) => `${t.year}-${t.month}:${t.expenses}`)).toEqual(['2025-1:100.00', '2025-2:500.00', '2025-3:860.00']);
    const six = await progress(ana, '?year=2025&month=3&window=6M');
    expect(six.trend.map((t) => `${t.year}-${t.month}`)).toEqual(['2024-10', '2024-11', '2024-12', '2025-1', '2025-2', '2025-3']);
    expect(six.trend[0]).toMatchObject({ from: '2024-10-01', to: '2024-10-31', income: '0.00', expenses: '0.00' });
  });

  it('null variations when the baseline is 0', async () => {
    const p = await progress(ana, '?year=2025&month=1');
    expect(p.kpis.totalSpending).toEqual({ current: '100.00', previous: '0.00', changeAmount: '100.00', changePercent: null });
    expect(p.kpis.netCashFlowBuffer.changePercent).toBeNull();
    expect(p.kpis.savingsRate).toEqual({ current: '88.89', previous: null, changePoints: null });
  });

  it('applies the partner filter to KPIs, trend and categories', async () => {
    const p = await progress(ana, '?year=2025&month=3&partner=PARTNER_2');
    expect(p.partner).toBe('PARTNER_2');
    expect(p.kpis.totalSpending).toEqual({ current: '500.00', previous: '300.00', changeAmount: '200.00', changePercent: '66.67' });
    expect(p.kpis.householdIncome).toEqual({ current: '1200.00', previous: '0.00', changeAmount: '1200.00', changePercent: null });
    expect(p.kpis.savingsRate).toEqual({ current: '58.33', previous: null, changePoints: null });
    // Travel was Shared → excluded under a partner filter.
    expect(p.categories.map((c) => c.category.id)).toEqual([rent, groceries]);
    expect(p.trend[0]).toMatchObject({ month: 2, expenses: '300.00', income: '0.00' });
  });

  it('defaults to the current month with equivalent periods (household timezone)', async () => {
    const today = todayInTimeZone(new Date(), 'America/Argentina/Buenos_Aires');
    const p = await progress(ana, '');
    const n = parseInt(today.slice(8, 10), 10);
    expect(p.current).toEqual({ from: `${today.slice(0, 8)}01`, to: today });
    expect(p.isPartial).toBe(true);
    expect(p.trend.at(-1)).toMatchObject({ to: today, isPartial: true });
    const prevDay = parseInt(p.previous.to.slice(8, 10), 10);
    expect(prevDay).toBeLessThanOrEqual(n);
    expect(p.previous.from.slice(8)).toBe('01');
  });

  it('rejects a future month (422) and bad queries (400)', async () => {
    const today = todayInTimeZone(new Date(), 'America/Argentina/Buenos_Aires');
    const next = shiftMonth(parseInt(today.slice(0, 4), 10), parseInt(today.slice(5, 7), 10), 1);
    const res = await request(ctx.http).get(`/api/financial-progress/comparison?year=${next.year}&month=${next.month}`).set(bearer(ana.accessToken)).expect(422);
    expect(res.body.error).toBe('FUTURE_PERIOD');
    await request(ctx.http).get('/api/financial-progress/comparison?window=YTD').set(bearer(ana.accessToken)).expect(400);
    await request(ctx.http).get('/api/financial-progress/comparison?year=2025').set(bearer(ana.accessToken)).expect(400);
    await request(ctx.http).get('/api/financial-progress/comparison').expect(401);
  });

  it("never includes another household's data", async () => {
    const b = await progress(carla, '?year=2025&month=3');
    expect(b.kpis.totalSpending.current).toBe('777.00');
    expect(b.kpis.householdIncome.current).toBe('0.00');
    expect(b.categories.some((c) => [groceries, travel, rent].includes(c.category.id))).toBe(false);
    expect((await progress(ana, '?year=2025&month=3')).kpis.totalSpending.current).toBe('860.00');
  });
});
