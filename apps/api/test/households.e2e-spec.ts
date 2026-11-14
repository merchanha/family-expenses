import request from 'supertest';
import {
  createInviteResponseSchema,
  currentHouseholdResponseSchema,
  currentUserResponseSchema,
  DEFAULT_CATEGORIES,
  invitePreviewResponseSchema,
} from '@tandem/shared';
import { acceptInvite, bearer, createE2eApp, createHousehold, E2eContext, invite, registerUser } from './helpers';

describe('Households (e2e)', () => {
  let ctx: E2eContext;
  beforeAll(async () => (ctx = await createE2eApp('hh')));
  afterAll(() => ctx.close());

  it('users without a household get household:null and 403 HOUSEHOLD_REQUIRED on household routes', async () => {
    const u = await registerUser(ctx, 'nohh');
    const me = await request(ctx.http).get('/api/auth/me').set(bearer(u.accessToken)).expect(200);
    expect(me.body.household).toBeNull();
    for (const [method, path] of [
      ['get', '/api/households/me'],
      ['patch', '/api/households/me'],
      ['patch', '/api/households/me/members/me'],
      ['post', '/api/households/me/invites'],
      ['delete', '/api/households/me/invites/x'],
    ] as const) {
      const res = await request(ctx.http)[method](path).set(bearer(u.accessToken)).send({ name: 'x' }).expect(403);
      expect(res.body).toMatchObject({ statusCode: 403, error: 'HOUSEHOLD_REQUIRED' });
    }
  });

  it('creates a household atomically: OWNER/PARTNER_1, ARS, 50/50, default categories', async () => {
    const u = await registerUser(ctx, 'create', 'Ana');
    const res = await request(ctx.http)
      .post('/api/households')
      .set(bearer(u.accessToken))
      .send({ name: 'Casa Ana', displayName: 'Anita', householdId: 'ignored' })
      .expect(201);
    const body = currentHouseholdResponseSchema.parse(res.body);
    expect(body.household).toMatchObject({
      name: 'Casa Ana',
      defaultCurrency: 'ARS',
      timezone: 'America/Argentina/Buenos_Aires',
      defaultSplitPartner1Percent: 50,
    });
    expect(body.members).toHaveLength(1);
    expect(body.members[0]).toMatchObject({ userId: u.id, role: 'OWNER', partnerSlot: 'PARTNER_1', displayName: 'Anita', displayColor: '#6366F1' });
    expect(body.me).toEqual({ userId: u.id, partnerSlot: 'PARTNER_1', role: 'OWNER' });
    expect(await ctx.prisma.category.count({ where: { householdId: body.household.id } })).toBe(DEFAULT_CATEGORIES.length);

    const me = currentUserResponseSchema.parse((await request(ctx.http).get('/api/auth/me').set(bearer(u.accessToken))).body);
    expect(me.household).toEqual({ id: body.household.id, name: 'Casa Ana', partnerSlot: 'PARTNER_1', role: 'OWNER' });

    const again = await request(ctx.http).post('/api/households').set(bearer(u.accessToken)).send({ name: 'Otra' }).expect(409);
    expect(again.body.error).toBe('ALREADY_IN_HOUSEHOLD');
  });

  it('validates household creation', async () => {
    const u = await registerUser(ctx, 'createval');
    const res = await request(ctx.http).post('/api/households').set(bearer(u.accessToken)).send({ name: '', timezone: 'Mars/Base', defaultCurrency: 'PESOS' }).expect(400);
    expect(res.body.issues.map((i: { path: string }) => i.path).sort()).toEqual(['defaultCurrency', 'name', 'timezone']);
  });

  describe('invite flow', () => {
    it('owner invites, partner previews + accepts as MEMBER/PARTNER_2, household is then full', async () => {
      const ana = await registerUser(ctx, 'inv-ana', 'Ana');
      const bruno = await registerUser(ctx, 'inv-bruno', 'Bruno');
      const carla = await registerUser(ctx, 'inv-carla', 'Carla');
      const householdId = await createHousehold(ctx, ana, 'Casa');

      const created = await request(ctx.http).post('/api/households/me/invites').set(bearer(ana.accessToken)).send({ email: bruno.email.toUpperCase() }).expect(201);
      const { invite: inv, inviteUrl } = createInviteResponseSchema.parse(created.body);
      expect(inv).toMatchObject({ email: bruno.email, status: 'PENDING', invitedById: ana.id });
      expect(JSON.stringify(created.body)).not.toMatch(/tokenHash/);
      const token = new URL(inviteUrl).searchParams.get('token')!;
      expect(ctx.mail.invites.at(-1)).toMatchObject({ to: bruno.email, inviterName: 'Ana', householdName: 'Casa', link: inviteUrl });
      const stored = await ctx.prisma.householdInvite.findUniqueOrThrow({ where: { id: inv.id } });
      expect(stored.tokenHash).not.toBe(token);

      const hh = currentHouseholdResponseSchema.parse((await request(ctx.http).get('/api/households/me').set(bearer(ana.accessToken))).body);
      expect(hh.invites.map((i) => i.id)).toEqual([inv.id]);

      const preview = await request(ctx.http).get(`/api/invites/${encodeURIComponent(token)}`).expect(200);
      expect(invitePreviewResponseSchema.parse(preview.body)).toMatchObject({ householdName: 'Casa', invitedByName: 'Ana', email: bruno.email, status: 'PENDING' });
      await request(ctx.http).get('/api/invites/not-a-real-token').expect(404);

      const wrong = await request(ctx.http).post('/api/invites/accept').set(bearer(carla.accessToken)).send({ token }).expect(403);
      expect(wrong.body.error).toBe('INVITE_EMAIL_MISMATCH');
      await request(ctx.http).post('/api/invites/accept').send({ token }).expect(401);

      const accepted = await request(ctx.http).post('/api/invites/accept').set(bearer(bruno.accessToken)).send({ token }).expect(200);
      const joined = currentHouseholdResponseSchema.parse(accepted.body);
      expect(joined.household.id).toBe(householdId);
      expect(joined.members.map((m) => [m.userId, m.role, m.partnerSlot])).toEqual([
        [ana.id, 'OWNER', 'PARTNER_1'],
        [bruno.id, 'MEMBER', 'PARTNER_2'],
      ]);
      expect(joined.me).toEqual({ userId: bruno.id, partnerSlot: 'PARTNER_2', role: 'MEMBER' });
      expect(joined.invites).toEqual([]);

      // Both partners see the same household.
      const fromAna = currentHouseholdResponseSchema.parse((await request(ctx.http).get('/api/households/me').set(bearer(ana.accessToken))).body);
      expect(fromAna.members).toHaveLength(2);

      await request(ctx.http).post('/api/invites/accept').set(bearer(bruno.accessToken)).send({ token }).expect(409);
      const full = await request(ctx.http).post('/api/households/me/invites').set(bearer(ana.accessToken)).send({ email: carla.email }).expect(409);
      expect(full.body.error).toBe('HOUSEHOLD_FULL');
      const notOwner = await request(ctx.http).post('/api/households/me/invites').set(bearer(bruno.accessToken)).send({ email: carla.email }).expect(403);
      expect(notOwner.body.error).toBe('OWNER_ONLY');
    });

    it('revoke, replace and expiry make tokens unusable', async () => {
      const ana = await registerUser(ctx, 'rev-ana', 'Ana');
      const bruno = await registerUser(ctx, 'rev-bruno', 'Bruno');
      await createHousehold(ctx, ana, 'Casa');

      const first = await invite(ctx, ana, bruno.email);
      const second = await invite(ctx, ana, bruno.email);
      const replaced = await request(ctx.http).post('/api/invites/accept').set(bearer(bruno.accessToken)).send({ token: first.token }).expect(422);
      expect(replaced.body.error).toBe('INVITE_NOT_USABLE');

      await request(ctx.http).delete(`/api/households/me/invites/${second.id}`).set(bearer(ana.accessToken)).expect(204);
      await request(ctx.http).delete(`/api/households/me/invites/${second.id}`).set(bearer(ana.accessToken)).expect(422);
      await request(ctx.http).post('/api/invites/accept').set(bearer(bruno.accessToken)).send({ token: second.token }).expect(422);
      expect((await request(ctx.http).get(`/api/invites/${second.token}`)).body.status).toBe('REVOKED');

      const third = await invite(ctx, ana, bruno.email);
      await ctx.prisma.householdInvite.update({ where: { id: third.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await request(ctx.http).get(`/api/invites/${third.token}`)).body.status).toBe('EXPIRED');
      await request(ctx.http).post('/api/invites/accept').set(bearer(bruno.accessToken)).send({ token: third.token }).expect(422);

      const self = await request(ctx.http).post('/api/households/me/invites').set(bearer(ana.accessToken)).send({ email: ana.email }).expect(422);
      expect(self.body.error).toBe('CANNOT_INVITE_SELF');
    });
  });

  describe('settings', () => {
    it('either partner updates household settings; split must be an integer 1–99', async () => {
      const ana = await registerUser(ctx, 'set-ana');
      const bruno = await registerUser(ctx, 'set-bruno');
      await createHousehold(ctx, ana, 'Casa');
      await acceptInvite(ctx, bruno, (await invite(ctx, ana, bruno.email)).token);

      for (const bad of [0, 100, 50.5, '60']) {
        await request(ctx.http).patch('/api/households/me').set(bearer(ana.accessToken)).send({ defaultSplitPartner1Percent: bad }).expect(400);
      }
      await request(ctx.http).patch('/api/households/me').set(bearer(ana.accessToken)).send({}).expect(400);

      const res = await request(ctx.http)
        .patch('/api/households/me')
        .set(bearer(bruno.accessToken))
        .send({ name: 'Casa Nueva', defaultSplitPartner1Percent: 60, defaultCurrency: 'usd', timezone: 'America/New_York' })
        .expect(200);
      expect(currentHouseholdResponseSchema.parse(res.body).household).toMatchObject({
        name: 'Casa Nueva',
        defaultSplitPartner1Percent: 60,
        defaultCurrency: 'USD',
        timezone: 'America/New_York',
      });
    });

    it('a member edits only their own display name/color', async () => {
      const ana = await registerUser(ctx, 'disp-ana');
      const bruno = await registerUser(ctx, 'disp-bruno');
      await createHousehold(ctx, ana, 'Casa');
      await acceptInvite(ctx, bruno, (await invite(ctx, ana, bruno.email)).token);

      const res = await request(ctx.http)
        .patch('/api/households/me/members/me')
        .set(bearer(bruno.accessToken))
        .send({ displayName: 'Bru', displayColor: '#123ABC', userId: ana.id })
        .expect(200);
      const body = currentHouseholdResponseSchema.parse(res.body);
      expect(body.members.find((m) => m.userId === bruno.id)).toMatchObject({ displayName: 'Bru', displayColor: '#123ABC' });
      expect(body.members.find((m) => m.userId === ana.id)).toMatchObject({ displayName: null, displayColor: '#6366F1' });
      await request(ctx.http).patch('/api/households/me/members/me').set(bearer(bruno.accessToken)).send({ displayColor: 'red' }).expect(400);
    });
  });
});
