import request from 'supertest';
import { dashboardChartsResponseSchema, type DashboardChartsResponse } from '@tandem/shared';
import { monthPeriod, shiftMonth, todayInTimeZone } from '../src/common/period';
import { acceptInvite, bearer, categoryId, createE2eApp, createHousehold, createTx, E2eContext, invite, registerUser, TestUser } from './helpers';

describe('Dashboard charts (e2e)', () => {
  let ctx: E2eContext;
  let ana: TestUser, bruno: TestUser, carla: TestUser;
  let groceries: string, rent: string, salary: string;

  const charts = async (u: TestUser, qs: string): Promise<DashboardChartsResponse> =>
    dashboardChartsResponseSchema.parse((await request(ctx.http).get(`/api/summaries/charts${qs}`).set(bearer(u.accessToken)).expect(200)).body);

  beforeAll(async () => {
    ctx = await createE2eApp('charts');
    [ana, bruno, carla] = await Promise.all(['ana', 'bruno', 'carla'].map((l) => registerUser(ctx, l)));
    await createHousehold(ctx, ana, 'A');
    await createHousehold(ctx, carla, 'B');
    await acceptInvite(ctx, bruno, (await invite(ctx, ana, bruno.email)).token);
    groceries = await categoryId(ctx, ana, 'EXPENSE', 'Groceries & Food');
    rent = await categoryId(ctx, ana, 'EXPENSE', 'Rent & Housing');
    salary = await categoryId(ctx, ana, 'INCOME', 'Salary');
    const tx = (u: TestUser, type: 'INCOME' | 'EXPENSE', amount: string, date: string, cat: string, paidById: string | null) =>
      createTx(ctx, u, { type, description: `${type} ${amount}`, amount, categoryId: cat, transactionDate: date, paidById });
    // Feb 2025 (28 days)
    await tx(ana, 'INCOME', '1000.00', '2025-02-01', salary, ana.id);
    await tx(ana, 'EXPENSE', '100.10', '2025-02-03', groceries, ana.id);
    await tx(bruno, 'EXPENSE', '200.20', '2025-02-03', groceries, bruno.id);
    await tx(ana, 'EXPENSE', '0.01', '2025-02-28', rent, null);
    await tx(ana, 'EXPENSE', '5.00', '2025-03-01', rent, null); // outside
    const carlaCat = await categoryId(ctx, carla, 'EXPENSE');
    await tx(carla, 'EXPENSE', '777.00', '2025-02-03', carlaCat, null);
  });
  afterAll(() => ctx.close());

  it('returns a daily cumulative trajectory for a past month (P3-003)', async () => {
    const c = await charts(ana, '?year=2025&month=2');
    expect(c.period).toEqual({ from: '2025-02-01', to: '2025-02-28', year: 2025, month: 2 });
    expect(c.cashFlowTrajectory).toHaveLength(28);
    expect(c.cashFlowTrajectory[0]).toEqual({ date: '2025-02-01', cumulativeIncome: '1000.00', cumulativeExpenses: '0.00' });
    expect(c.cashFlowTrajectory[1]).toEqual({ date: '2025-02-02', cumulativeIncome: '1000.00', cumulativeExpenses: '0.00' });
    expect(c.cashFlowTrajectory[2]).toEqual({ date: '2025-02-03', cumulativeIncome: '1000.00', cumulativeExpenses: '300.30' });
    expect(c.cashFlowTrajectory[27]).toEqual({ date: '2025-02-28', cumulativeIncome: '1000.00', cumulativeExpenses: '300.31' });
  });

  it('returns spending by category with half-up shares, sorted desc', async () => {
    const c = await charts(ana, '?year=2025&month=2');
    expect(c.totalExpenses).toBe('300.31');
    expect(c.spendingByCategory.map((s) => [s.category.id, s.amount, s.sharePercent])).toEqual([
      [groceries, '300.30', '100.00'], // 99.9967 → 100.00
      [rent, '0.01', '0.00'], // 0.0033 → 0.00
    ]);
  });

  it('applies the partner filter everywhere (Shared excluded)', async () => {
    const c = await charts(ana, '?year=2025&month=2&partner=PARTNER_2');
    expect(c.partner).toBe('PARTNER_2');
    expect(c.cashFlowTrajectory.at(-1)).toEqual({ date: '2025-02-28', cumulativeIncome: '0.00', cumulativeExpenses: '200.20' });
    expect(c.spendingByCategory).toEqual([expect.objectContaining({ amount: '200.20', sharePercent: '100.00' })]);
    expect(c.totalExpenses).toBe('200.20');
  });

  it('current month runs to today (household tz); a future month has no trajectory', async () => {
    const today = todayInTimeZone(new Date(), 'America/Argentina/Buenos_Aires');
    const c = await charts(ana, '');
    expect(c.cashFlowTrajectory.at(-1)?.date).toBe(today);
    expect(c.cashFlowTrajectory).toHaveLength(parseInt(today.slice(8, 10), 10));
    const next = shiftMonth(parseInt(today.slice(0, 4), 10), parseInt(today.slice(5, 7), 10), 1);
    const f = await charts(ana, `?year=${next.year}&month=${next.month}`);
    expect(f.period).toEqual(monthPeriod(next.year, next.month));
    expect(f.cashFlowTrajectory).toEqual([]);
    expect(f.spendingByCategory).toEqual([]);
  });

  it('validates the query and requires auth', async () => {
    await request(ctx.http).get('/api/summaries/charts?month=2').set(bearer(ana.accessToken)).expect(400);
    await request(ctx.http).get('/api/summaries/charts').expect(401);
  });

  it("never includes another household's transactions", async () => {
    const a = await charts(ana, '?year=2025&month=2');
    expect(a.totalExpenses).toBe('300.31');
    const b = await charts(carla, '?year=2025&month=2');
    expect(b.totalExpenses).toBe('777.00');
    expect(b.cashFlowTrajectory.at(-1)?.cumulativeIncome).toBe('0.00');
    expect(b.spendingByCategory.some((s) => s.category.id === groceries || s.category.id === rent)).toBe(false);
  });
});
