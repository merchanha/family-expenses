import request from 'supertest';
import { transactionListResponseSchema, transactionSchema, type Transaction } from '@tandem/shared';
import {
  acceptInvite,
  bearer,
  categoryId,
  createE2eApp,
  createHousehold,
  createTx,
  E2eContext,
  invite,
  registerUser,
  TestUser,
  TxBody,
} from './helpers';

describe('Transactions (e2e)', () => {
  let ctx: E2eContext;
  let ana: TestUser, bruno: TestUser, carla: TestUser;
  let groceries: string, salary: string, carlaGroceries: string;

  const api = (u: TestUser) => ({
    get: (p: string) => request(ctx.http).get(p).set(bearer(u.accessToken)),
    post: (p: string, b: object) => request(ctx.http).post(p).set(bearer(u.accessToken)).send(b),
    patch: (p: string, b: object) => request(ctx.http).patch(p).set(bearer(u.accessToken)).send(b),
    del: (p: string) => request(ctx.http).delete(p).set(bearer(u.accessToken)),
  });
  const list = async (u: TestUser, qs = '') =>
    transactionListResponseSchema.parse((await api(u).get(`/api/transactions${qs}`).expect(200)).body);
  const expense = (over: Partial<TxBody> = {}): TxBody => ({
    type: 'EXPENSE',
    description: 'Supermarket',
    amount: '1234.50',
    categoryId: groceries,
    transactionDate: '2026-10-15',
    ...over,
  });

  beforeAll(async () => {
    ctx = await createE2eApp('tx');
    [ana, bruno, carla] = await Promise.all(['ana', 'bruno', 'carla'].map((l) => registerUser(ctx, l)));
    await createHousehold(ctx, ana, 'A');
    await createHousehold(ctx, carla, 'B');
    await acceptInvite(ctx, bruno, (await invite(ctx, ana, bruno.email)).token);
    groceries = await categoryId(ctx, ana, 'EXPENSE', 'Groceries & Food');
    salary = await categoryId(ctx, ana, 'INCOME', 'Salary');
    carlaGroceries = await categoryId(ctx, carla, 'EXPENSE', 'Groceries & Food');
  });
  afterAll(() => ctx.close());

  describe('CRUD + validation (P2-003, P2-014)', () => {
    it('creates with category, createdBy and paidBy identities', async () => {
      const res = await api(ana).post('/api/transactions', expense({ paidById: bruno.id, notes: 'weekly' })).expect(201);
      const tx = transactionSchema.parse(res.body);
      expect(tx).toMatchObject({
        type: 'EXPENSE',
        amount: '1234.50',
        currency: 'ARS',
        transactionDate: '2026-10-15',
        notes: 'weekly',
        category: { id: groceries, name: 'Groceries & Food', type: 'EXPENSE', isActive: true },
        createdBy: { userId: ana.id, partnerSlot: 'PARTNER_1', name: 'ana' },
        paidBy: { userId: bruno.id, partnerSlot: 'PARTNER_2', name: 'bruno' },
      });
      expect((await api(bruno).get(`/api/transactions/${tx.id}`).expect(200)).body.id).toBe(tx.id);
    });

    it('normalizes amounts to 2 decimals and stores exact Decimal', async () => {
      const id = await createTx(ctx, ana, expense({ amount: '0.1' }));
      expect((await api(ana).get(`/api/transactions/${id}`)).body.amount).toBe('0.10');
      expect((await ctx.prisma.transaction.findUniqueOrThrow({ where: { id } })).amount.toFixed(2)).toBe('0.10');
    });

    it('rejects invalid input with 400', async () => {
      for (const amount of ['0', '0.00', '-5', '1.234', 'abc']) {
        const r = await api(ana).post('/api/transactions', { ...expense(), amount }).expect(400);
        expect(r.body.issues[0].path).toBe('amount');
      }
      await api(ana).post('/api/transactions', { ...expense(), amount: 12.5 }).expect(400); // JSON number
      await api(ana).post('/api/transactions', { ...expense(), transactionDate: '2026-02-30' }).expect(400);
      await api(ana).post('/api/transactions', { ...expense(), description: '  ' }).expect(400);
      const r = await api(ana).post('/api/transactions', { type: 'EXPENSE' }).expect(400);
      expect(r.body.issues.map((i: { path: string }) => i.path).sort()).toEqual(['amount', 'categoryId', 'description', 'transactionDate']);
    });

    it('rejects category type mismatch with 422', async () => {
      const r1 = await api(ana).post('/api/transactions', expense({ categoryId: salary })).expect(422);
      expect(r1.body.error).toBe('CATEGORY_TYPE_MISMATCH');
      const r2 = await api(ana).post('/api/transactions', expense({ type: 'INCOME' })).expect(422);
      expect(r2.body.error).toBe('CATEGORY_TYPE_MISMATCH');
    });

    it('rejects unknown category and paidBy outside the household with 422', async () => {
      expect((await api(ana).post('/api/transactions', expense({ categoryId: 'nope' })).expect(422)).body.error).toBe('INVALID_CATEGORY');
      expect((await api(ana).post('/api/transactions', expense({ paidById: 'nope' })).expect(422)).body.error).toBe('PAID_BY_NOT_MEMBER');
    });

    it('updates partially and re-checks the category/type pair', async () => {
      const id = await createTx(ctx, ana, expense());
      const r = await api(bruno).patch(`/api/transactions/${id}`, { amount: '99.99', paidById: bruno.id, description: 'Edited' }).expect(200);
      expect(r.body).toMatchObject({ amount: '99.99', description: 'Edited', paidBy: { userId: bruno.id }, createdBy: { userId: ana.id } });
      expect((await api(ana).patch(`/api/transactions/${id}`, { type: 'INCOME' }).expect(422)).body.error).toBe('CATEGORY_TYPE_MISMATCH');
      const r2 = await api(ana).patch(`/api/transactions/${id}`, { type: 'INCOME', categoryId: salary, paidById: null }).expect(200);
      expect(r2.body).toMatchObject({ type: 'INCOME', category: { id: salary }, paidBy: null });
      await api(ana).patch(`/api/transactions/${id}`, {}).expect(400);
      await api(ana).patch(`/api/transactions/${id}`, { amount: '0' }).expect(400);
    });

    it('deletes (204) and then 404', async () => {
      const id = await createTx(ctx, ana, expense());
      await api(bruno).del(`/api/transactions/${id}`).expect(204);
      await api(ana).get(`/api/transactions/${id}`).expect(404);
      expect((await api(ana).del(`/api/transactions/${id}`).expect(404)).body.error).toBe('TRANSACTION_NOT_FOUND');
    });
  });

  describe('list filters + pagination (P2-004, P2-006)', () => {
    // Fresh data in a month nobody else uses.
    const M = '?year=2025&month=3';
    beforeAll(async () => {
      await createTx(ctx, ana, expense({ description: 'Coto groceries', amount: '100.00', transactionDate: '2025-03-01', paidById: ana.id }));
      await createTx(ctx, ana, expense({ description: 'Dia market', amount: '200.00', transactionDate: '2025-03-10', paidById: bruno.id }));
      await createTx(ctx, bruno, expense({ description: 'Shared dinner', amount: '300.00', transactionDate: '2025-03-20', notes: 'with friends' }));
      await createTx(ctx, ana, { type: 'INCOME', description: 'Payroll', amount: '5000.00', categoryId: salary, transactionDate: '2025-03-31', paidById: ana.id });
      await createTx(ctx, ana, expense({ description: 'Out of month', transactionDate: '2025-04-01', paidById: ana.id }));
    });
    const descs = (r: { items: Transaction[] }) => r.items.map((t) => t.description);

    it('period filter by year+month and from+to, newest first', async () => {
      expect(descs(await list(ana, M))).toEqual(['Payroll', 'Shared dinner', 'Dia market', 'Coto groceries']);
      expect(descs(await list(ana, '?from=2025-03-10&to=2025-03-20'))).toEqual(['Shared dinner', 'Dia market']);
      await api(ana).get('/api/transactions?year=2025').expect(400);
      await api(ana).get('/api/transactions?from=2025-03-10&to=2025-03-01').expect(400);
      await api(ana).get('/api/transactions?year=2025&month=3&from=2025-03-01&to=2025-03-02').expect(400);
    });

    it('type, category and text search filters', async () => {
      expect(descs(await list(ana, `${M}&type=INCOME`))).toEqual(['Payroll']);
      expect(descs(await list(ana, `${M}&categoryId=${salary}`))).toEqual(['Payroll']);
      expect(descs(await list(ana, `${M}&q=MARKET`))).toEqual(['Dia market']);
      expect(descs(await list(ana, `${M}&q=friends`))).toEqual(['Shared dinner']); // notes
    });

    it('search treats % _ and \\ literally, not as LIKE wildcards', async () => {
      const W = '?year=2024&month=5';
      await createTx(ctx, ana, expense({ description: '50% off sale', transactionDate: '2024-05-01' }));
      await createTx(ctx, ana, expense({ description: 'snake_case shop', transactionDate: '2024-05-02' }));
      await createTx(ctx, ana, expense({ description: 'back\\slash', transactionDate: '2024-05-03' }));
      await createTx(ctx, ana, expense({ description: 'plain', transactionDate: '2024-05-04' }));
      expect(descs(await list(ana, `${W}&q=${encodeURIComponent('%')}`))).toEqual(['50% off sale']);
      expect(descs(await list(ana, `${W}&q=_`))).toEqual(['snake_case shop']);
      expect(descs(await list(ana, `${W}&q=${encodeURIComponent('\\')}`))).toEqual(['back\\slash']);
    });

    it('partner filter uses paid by; Shared rows only appear under All Shared', async () => {
      expect(descs(await list(ana, `${M}&partner=PARTNER_1`))).toEqual(['Payroll', 'Coto groceries']);
      expect(descs(await list(bruno, `${M}&partner=PARTNER_2`))).toEqual(['Dia market']);
      await api(ana).get('/api/transactions?partner=PARTNER_3').expect(400);
    });

    it('a partner slot with no member yields nothing (not another household data)', async () => {
      expect((await list(carla, '?partner=PARTNER_2')).items).toEqual([]);
    });

    it('cursor pagination walks every row once', async () => {
      const p1 = await list(ana, `${M}&limit=3`);
      expect(p1.items).toHaveLength(3);
      expect(p1.nextCursor).not.toBeNull();
      const p2 = await list(ana, `${M}&limit=3&cursor=${encodeURIComponent(p1.nextCursor!)}`);
      expect(descs(p2)).toEqual(['Coto groceries']);
      expect(p2.nextCursor).toBeNull();
      expect((await api(ana).get('/api/transactions?cursor=garbage').expect(400)).body.error).toBe('INVALID_CURSOR');
      await api(ana).get('/api/transactions?limit=0').expect(400);
      await api(ana).get('/api/transactions?limit=101').expect(400);
    });

    it('cursor stays stable across same-date rows and inserts during paging (QA P2)', async () => {
      const W = '?year=2023&month=8';
      const ids: string[] = [];
      for (let i = 0; i < 7; i++) ids.push(await createTx(ctx, ana, expense({ description: `same day ${i}`, transactionDate: '2023-08-08' })));
      const seen: string[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const page = await list(ana, `${W}&limit=3${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
        seen.push(...page.items.map((t) => t.id));
        cursor = page.nextCursor;
        // A newer row (same date, later createdAt) sorts before the cursor, so later pages must not show it.
        if (++pages === 1) await createTx(ctx, ana, expense({ description: 'inserted while paging', transactionDate: '2023-08-08' }));
      } while (cursor && pages < 10);
      expect(pages).toBe(3);
      expect(new Set(seen).size).toBe(7);
      expect([...seen].sort()).toEqual([...ids].sort());
    });
  });

  describe('household isolation', () => {
    let anaTx: string;
    beforeAll(async () => {
      anaTx = await createTx(ctx, ana, expense({ description: 'A secret', amount: '42.00' }));
    });

    it('GET /transactions lists only the caller household', async () => {
      const b = await list(carla);
      expect(b.items.some((t) => t.id === anaTx)).toBe(false);
      expect(JSON.stringify(b)).not.toContain(ana.id);
      expect((await list(carla, `?categoryId=${groceries}`)).items).toEqual([]);
    });

    it('GET /transactions/:id of another household → 404', async () => {
      expect((await api(carla).get(`/api/transactions/${anaTx}`).expect(404)).body.error).toBe('TRANSACTION_NOT_FOUND');
    });

    it('POST /transactions cannot use another household category or paidBy, and ignores householdId', async () => {
      expect((await api(carla).post('/api/transactions', expense()).expect(422)).body.error).toBe('INVALID_CATEGORY');
      expect(
        (await api(carla).post('/api/transactions', expense({ categoryId: carlaGroceries, paidById: ana.id })).expect(422)).body.error,
      ).toBe('PAID_BY_NOT_MEMBER');
      const householdA = (await ctx.prisma.transaction.findUniqueOrThrow({ where: { id: anaTx } })).householdId;
      const res = await api(carla).post('/api/transactions', { ...expense({ categoryId: carlaGroceries }), householdId: householdA, createdById: ana.id }).expect(201);
      const row = await ctx.prisma.transaction.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(row.householdId).not.toBe(householdA);
      expect(row.createdById).toBe(carla.id);
    });

    it('PATCH /transactions/:id of another household → 404 and unchanged; cannot move a tx onto a foreign category', async () => {
      await api(carla).patch(`/api/transactions/${anaTx}`, { amount: '1.00' }).expect(404);
      expect((await ctx.prisma.transaction.findUniqueOrThrow({ where: { id: anaTx } })).amount.toFixed(2)).toBe('42.00');
      expect((await api(ana).patch(`/api/transactions/${anaTx}`, { categoryId: carlaGroceries }).expect(422)).body.error).toBe('INVALID_CATEGORY');
    });

    it('DELETE /transactions/:id of another household → 404 and still there', async () => {
      await api(carla).del(`/api/transactions/${anaTx}`).expect(404);
      expect(await ctx.prisma.transaction.findUnique({ where: { id: anaTx } })).not.toBeNull();
    });
  });
});
