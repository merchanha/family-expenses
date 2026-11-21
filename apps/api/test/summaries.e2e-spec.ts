import request from 'supertest';
import { periodSummaryResponseSchema } from '@tandem/shared';
import { todayInTimeZone } from '../src/common/period';
import { acceptInvite, bearer, categoryId, createE2eApp, createHousehold, createTx, E2eContext, invite, registerUser, TestUser } from './helpers';

describe('Period summary (e2e)', () => {
  let ctx: E2eContext;
  let ana: TestUser, bruno: TestUser, carla: TestUser;
  let groceries: string, salary: string;

  const summary = async (u: TestUser, qs = '') =>
    periodSummaryResponseSchema.parse((await request(ctx.http).get(`/api/summaries/period${qs}`).set(bearer(u.accessToken)).expect(200)).body);

  beforeAll(async () => {
    ctx = await createE2eApp('sum');
    [ana, bruno, carla] = await Promise.all(['ana', 'bruno', 'carla'].map((l) => registerUser(ctx, l)));
    await createHousehold(ctx, ana, 'A');
    await createHousehold(ctx, carla, 'B');
    await acceptInvite(ctx, bruno, (await invite(ctx, ana, bruno.email)).token);
    groceries = await categoryId(ctx, ana, 'EXPENSE', 'Groceries & Food');
    salary = await categoryId(ctx, ana, 'INCOME', 'Salary');
    const tx = (u: TestUser, type: 'INCOME' | 'EXPENSE', amount: string, transactionDate: string, paidById: string | null) =>
      createTx(ctx, u, { type, description: `${type} ${amount}`, amount, categoryId: type === 'INCOME' ? salary : groceries, transactionDate, paidById });
    // March 2025: income 1000 (ana) + 0.30 (bruno); expenses 100.10 (ana) + 200.20 (bruno) + 50 (shared)
    await tx(ana, 'INCOME', '1000.00', '2025-03-01', ana.id);
    await tx(bruno, 'INCOME', '0.30', '2025-03-31', bruno.id);
    await tx(ana, 'EXPENSE', '100.10', '2025-03-05', ana.id);
    await tx(bruno, 'EXPENSE', '200.20', '2025-03-15', bruno.id);
    await tx(ana, 'EXPENSE', '50.00', '2025-03-20', null);
    // Boundaries: outside March
    await tx(ana, 'EXPENSE', '999.00', '2025-02-28', ana.id);
    await tx(ana, 'INCOME', '999.00', '2025-04-01', ana.id);
    // April 2025: expenses only → savings rate not available
    await tx(ana, 'EXPENSE', '10.00', '2025-04-02', ana.id);
  });
  afterAll(() => ctx.close());

  it('totals a month by transactionDate (P2-005)', async () => {
    const s = await summary(ana, '?year=2025&month=3');
    expect(s).toEqual({
      period: { from: '2025-03-01', to: '2025-03-31', year: 2025, month: 3 },
      partner: null,
      currency: 'ARS',
      income: '1000.30',
      expenses: '350.30',
      netCashFlowBuffer: '650.00',
      savingsRate: '64.98', // 650 / 1000.30 × 100 = 64.9805…
      transactionCount: 5,
    });
  });

  it('supports from/to ranges', async () => {
    const s = await summary(ana, '?from=2025-02-28&to=2025-03-05');
    expect(s).toMatchObject({ period: { from: '2025-02-28', to: '2025-03-05', year: null, month: null }, income: '1000.00', expenses: '1099.10', netCashFlowBuffer: '-99.10', savingsRate: '-9.91', transactionCount: 3 });
  });

  it('savings rate is null when income is 0', async () => {
    // April has 999 income on the 1st; use the 2nd onward.
    const s = await summary(ana, '?from=2025-04-02&to=2025-04-30');
    expect(s).toMatchObject({ income: '0.00', expenses: '10.00', netCashFlowBuffer: '-10.00', savingsRate: null });
    expect(await summary(ana, '?year=2020&month=1')).toMatchObject({ income: '0.00', expenses: '0.00', netCashFlowBuffer: '0.00', savingsRate: null, transactionCount: 0 });
  });

  it('partner filter uses paid by for every figure (P2-006)', async () => {
    expect(await summary(ana, '?year=2025&month=3&partner=PARTNER_1')).toMatchObject({
      partner: 'PARTNER_1',
      income: '1000.00',
      expenses: '100.10',
      netCashFlowBuffer: '899.90',
      savingsRate: '89.99',
      transactionCount: 2,
    });
    expect(await summary(ana, '?year=2025&month=3&partner=PARTNER_2')).toMatchObject({
      income: '0.30',
      expenses: '200.20',
      netCashFlowBuffer: '-199.90',
      savingsRate: '-66633.33',
      transactionCount: 2,
    });
  });

  it('defaults to the current month in the household timezone', async () => {
    const today = todayInTimeZone(new Date(), 'America/Argentina/Buenos_Aires');
    const [y, m] = today.split('-').map(Number);
    await createTx(ctx, ana, { type: 'EXPENSE', description: 'today', amount: '7.00', categoryId: groceries, transactionDate: today });
    const s = await summary(ana);
    expect(s.period).toMatchObject({ year: y, month: m });
    expect(s.expenses).toBe('7.00');
  });

  it('reflects edits and deletes', async () => {
    const id = await createTx(ctx, ana, { type: 'EXPENSE', description: 'edit me', amount: '5.00', categoryId: groceries, transactionDate: '2019-06-10' });
    expect((await summary(ana, '?year=2019&month=6')).expenses).toBe('5.00');
    await request(ctx.http).patch(`/api/transactions/${id}`).set(bearer(ana.accessToken)).send({ amount: '8.25' }).expect(200);
    expect((await summary(ana, '?year=2019&month=6')).expenses).toBe('8.25');
    await request(ctx.http).patch(`/api/transactions/${id}`).set(bearer(ana.accessToken)).send({ transactionDate: '2019-07-01' }).expect(200);
    expect((await summary(ana, '?year=2019&month=6')).expenses).toBe('0.00');
    await request(ctx.http).delete(`/api/transactions/${id}`).set(bearer(ana.accessToken)).expect(204);
    expect((await summary(ana, '?year=2019&month=7')).expenses).toBe('0.00');
  });

  it('validates the query', async () => {
    const get = (qs: string) => request(ctx.http).get(`/api/summaries/period${qs}`).set(bearer(ana.accessToken));
    await get('?year=2025').expect(400);
    await get('?year=2025&month=13').expect(400);
    await get('?from=2025-01-01').expect(400);
    await get('?partner=BOTH').expect(400);
    await request(ctx.http).get('/api/summaries/period').expect(401);
  });

  it('exact Decimal math end to end: half-up both signs, totals beyond NUMERIC(14,2), leap-day boundary (QA P2)', async () => {
    const tx = (type: 'INCOME' | 'EXPENSE', amount: string, transactionDate: string) =>
      createTx(ctx, ana, { type, description: `qa ${amount}`, amount, categoryId: type === 'INCOME' ? salary : groceries, transactionDate });
    const patch = (id: string, body: object) =>
      request(ctx.http).patch(`/api/transactions/${id}`).set(bearer(ana.accessToken)).send(body).expect(200);

    // 0.10 + 0.20 must be exactly 0.30 (float would give 0.30000000000000004).
    await tx('INCOME', '0.10', '2018-01-01');
    await tx('INCOME', '0.20', '2018-01-31');
    expect(await summary(ana, '?year=2018&month=1')).toMatchObject({ income: '0.30', savingsRate: '100.00' });

    // (400 − 399.98) / 400 × 100 = 0.005 exactly → 0.01; with expenses 400.02 → −0.005 → −0.01 (away from zero).
    await tx('INCOME', '400.00', '2018-02-01');
    const exp = await tx('EXPENSE', '399.98', '2018-02-28');
    expect(await summary(ana, '?year=2018&month=2')).toMatchObject({ netCashFlowBuffer: '0.02', savingsRate: '0.01' });
    await patch(exp, { amount: '400.02' });
    expect(await summary(ana, '?year=2018&month=2')).toMatchObject({ netCashFlowBuffer: '-0.02', savingsRate: '-0.01' });

    // Sums may exceed NUMERIC(14,2) and must stay exact.
    await tx('INCOME', '999999999999.99', '2018-03-01');
    await tx('INCOME', '999999999999.99', '2018-03-02');
    await tx('EXPENSE', '0.01', '2018-03-03');
    expect(await summary(ana, '?year=2018&month=3')).toMatchObject({
      income: '1999999999999.98',
      expenses: '0.01',
      netCashFlowBuffer: '1999999999999.97',
      savingsRate: '100.00',
    });

    // Leap year: Feb 2028 runs to the 29th; Mar 1 is excluded.
    await tx('EXPENSE', '1.00', '2028-02-29');
    await tx('EXPENSE', '2.00', '2028-03-01');
    expect(await summary(ana, '?year=2028&month=2')).toMatchObject({ period: { from: '2028-02-01', to: '2028-02-29' }, expenses: '1.00' });
  });

  it('household isolation: another household sees none of A totals', async () => {
    expect(await summary(carla, '?year=2025&month=3')).toMatchObject({ income: '0.00', expenses: '0.00', transactionCount: 0 });
    expect(await summary(carla, '?year=2025&month=3&partner=PARTNER_1')).toMatchObject({ income: '0.00', transactionCount: 0 });
    expect(await summary(carla, '?year=2025&month=3&partner=PARTNER_2')).toMatchObject({ income: '0.00', transactionCount: 0 });
  });
});
