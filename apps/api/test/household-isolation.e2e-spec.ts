import request from 'supertest';
import { currentHouseholdResponseSchema } from '@tandem/shared';
import { acceptInvite, bearer, createE2eApp, createHousehold, E2eContext, invite, registerUser, TestUser } from './helpers';

/**
 * X-001: one household can never read or change another household's data, for EVERY protected
 * endpoint. Household A = Ana (owner) + Bruno; household B = Carla (owner). Dan has no household.
 */
describe('Household isolation (e2e)', () => {
  let ctx: E2eContext;
  let ana: TestUser, bruno: TestUser, carla: TestUser, dan: TestUser;
  let householdA: string, householdB: string;
  let pendingInviteA: { id: string };

  const getHousehold = async (u: TestUser) =>
    currentHouseholdResponseSchema.parse((await request(ctx.http).get('/api/households/me').set(bearer(u.accessToken)).expect(200)).body);

  beforeAll(async () => {
    ctx = await createE2eApp('iso');
    [ana, bruno, carla, dan] = await Promise.all(['ana', 'bruno', 'carla', 'dan'].map((l) => registerUser(ctx, l, l)));
    householdA = await createHousehold(ctx, ana, 'Household A');
    householdB = await createHousehold(ctx, carla, 'Household B');
    await acceptInvite(ctx, bruno, (await invite(ctx, ana, bruno.email)).token);
    // A is full, so the API won't issue it an invite; insert a pending one directly so the
    // revoke/replace isolation checks have a target in A.
    const row = await ctx.prisma.householdInvite.create({
      data: {
        householdId: householdA,
        email: dan.email,
        tokenHash: `iso-${ctx.prefix}`,
        invitedById: ana.id,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    pendingInviteA = { id: row.id };
  });
  afterAll(() => ctx.close());

  it('GET /households/me returns only the caller household', async () => {
    const b = await getHousehold(carla);
    expect(b.household.id).toBe(householdB);
    expect(b.members.map((m) => m.userId)).toEqual([carla.id]);
    expect(JSON.stringify(b)).not.toContain(householdA);
    expect(JSON.stringify(b)).not.toContain(ana.id);
    expect((await getHousehold(bruno)).household.id).toBe(householdA);
  });

  it('GET /auth/me reports the caller household only', async () => {
    const res = await request(ctx.http).get('/api/auth/me').set(bearer(carla.accessToken)).expect(200);
    expect(res.body.household.id).toBe(householdB);
  });

  it('PATCH /households/me ignores a client householdId and changes only the caller household', async () => {
    await request(ctx.http)
      .patch('/api/households/me')
      .set(bearer(carla.accessToken))
      .send({ householdId: householdA, id: householdA, name: 'B renamed', defaultSplitPartner1Percent: 70 })
      .expect(200);
    expect((await getHousehold(ana)).household).toMatchObject({ id: householdA, name: 'Household A', defaultSplitPartner1Percent: 50 });
    expect((await getHousehold(carla)).household).toMatchObject({ id: householdB, name: 'B renamed', defaultSplitPartner1Percent: 70 });
  });

  it('PATCH /households/me/members/me cannot touch another household member', async () => {
    await request(ctx.http)
      .patch('/api/households/me/members/me')
      .set(bearer(carla.accessToken))
      .send({ householdId: householdA, userId: ana.id, displayName: 'Hacked' })
      .expect(200);
    const a = await getHousehold(ana);
    expect(a.members.every((m) => m.displayName !== 'Hacked')).toBe(true);
    expect((await getHousehold(carla)).members[0].displayName).toBe('Hacked');
  });

  it('POST /households/me/invites creates the invite in the caller household only', async () => {
    const res = await request(ctx.http)
      .post('/api/households/me/invites')
      .set(bearer(carla.accessToken))
      .send({ email: dan.email, householdId: householdA })
      .expect(201);
    const row = await ctx.prisma.householdInvite.findUniqueOrThrow({ where: { id: res.body.invite.id } });
    expect(row.householdId).toBe(householdB);
    // A's pending invite was not revoked by B's "replace pending".
    expect((await ctx.prisma.householdInvite.findUniqueOrThrow({ where: { id: pendingInviteA.id } })).status).toBe('PENDING');
  });

  it("DELETE /households/me/invites/:id returns 404 for another household's invite and leaves it intact", async () => {
    const res = await request(ctx.http).delete(`/api/households/me/invites/${pendingInviteA.id}`).set(bearer(carla.accessToken)).expect(404);
    expect(res.body).toMatchObject({ statusCode: 404, error: 'INVITE_NOT_FOUND' });
    expect((await ctx.prisma.householdInvite.findUniqueOrThrow({ where: { id: pendingInviteA.id } })).status).toBe('PENDING');
  });

  it("POST /invites/accept cannot move a member of A into B", async () => {
    // Carla (B) invites Ana (A); Ana cannot use it to move into B.
    const { token } = await invite(ctx, carla, ana.email);
    const res = await request(ctx.http).post('/api/invites/accept').set(bearer(ana.accessToken)).send({ token }).expect(409);
    expect(res.body.error).toBe('ALREADY_IN_HOUSEHOLD');
    expect((await getHousehold(carla)).members.map((m) => m.userId)).toEqual([carla.id]);
    expect((await getHousehold(ana)).members.map((m) => m.userId).sort()).toEqual([ana.id, bruno.id].sort());
  });

  it('a user without a household cannot reach any household-scoped data', async () => {
    const res = await request(ctx.http).get('/api/households/me').set(bearer(dan.accessToken)).expect(403);
    expect(res.body.error).toBe('HOUSEHOLD_REQUIRED');
    await request(ctx.http).delete(`/api/households/me/invites/${pendingInviteA.id}`).set(bearer(dan.accessToken)).expect(403);
  });

  it('PATCH /auth/me changes only the caller user', async () => {
    await request(ctx.http).patch('/api/auth/me').set(bearer(carla.accessToken)).send({ name: 'Carla 2', userId: ana.id }).expect(200);
    const a = await getHousehold(ana);
    expect(a.members.find((m) => m.userId === ana.id)?.name).toBe('ana');
  });
});
