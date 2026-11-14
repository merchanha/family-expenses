import type { HouseholdContext } from '../../../common/auth/auth-context';
import { FixedClock, RecordingMailService, tokenFromLink } from '../../../common/testing/fakes';
import { hashToken } from '../../../common/secure-token';
import { InMemoryHouseholdRepository, InMemoryInviteRepository } from '../__tests__/fakes';
import {
  AlreadyInHouseholdError,
  CannotInviteSelfError,
  HouseholdFullError,
  InviteEmailMismatchError,
  InviteNotFoundError,
  InviteNotUsableError,
  OwnerOnlyError,
} from '../domain/household.errors';
import { HouseholdSettings } from '../domain/household-settings';
import { AcceptInviteUseCase } from './accept-invite.use-case';
import { CreateHouseholdUseCase } from './create-household.use-case';
import { CreateInviteUseCase } from './create-invite.use-case';
import { RevokeInviteUseCase } from './revoke-invite.use-case';
import { UpdateHouseholdSettingsUseCase } from './update-household-settings.use-case';
import { UpdateMyMemberUseCase } from './update-my-member.use-case';

const DAY = 86_400_000;

function setup() {
  const clock = new FixedClock();
  const households = new InMemoryHouseholdRepository();
  const invites = new InMemoryInviteRepository(households);
  const mail = new RecordingMailService();
  const settings = new HouseholdSettings(7, 'http://web.test');
  const ana = households.addUser('Ana', 'ana@test.local');
  const bruno = households.addUser('Bruno', 'bruno@test.local');
  const carla = households.addUser('Carla', 'carla@test.local');
  return {
    clock,
    households,
    invites,
    mail,
    ana,
    bruno,
    carla,
    create: new CreateHouseholdUseCase(households),
    invite: new CreateInviteUseCase(households, invites, mail, settings, clock),
    revoke: new RevokeInviteUseCase(invites),
    accept: new AcceptInviteUseCase(households, invites, clock),
    updateSettings: new UpdateHouseholdSettingsUseCase(households),
    updateMember: new UpdateMyMemberUseCase(households),
  };
}

type T = ReturnType<typeof setup>;

async function ownerCtx(t: T): Promise<HouseholdContext> {
  const householdId = await t.create.execute({ userId: t.ana.id }, { name: 'Casa' });
  return { userId: t.ana.id, householdId, partnerSlot: 'PARTNER_1', role: 'OWNER' };
}

async function inviteToken(t: T, ctx: HouseholdContext, email = t.bruno.email): Promise<string> {
  const { inviteUrl } = await t.invite.execute(ctx, { email });
  return tokenFromLink(inviteUrl);
}

describe('CreateHouseholdUseCase', () => {
  it('creates the household with the caller as OWNER / PARTNER_1, ARS and default categories', async () => {
    const t = setup();
    const id = await t.create.execute({ userId: t.ana.id }, { name: 'Casa', displayName: 'Anita' });
    expect(await t.households.findById(id)).toMatchObject({
      name: 'Casa',
      defaultCurrency: 'ARS',
      timezone: 'America/Argentina/Buenos_Aires',
      defaultSplitPartner1Percent: 50,
    });
    expect(t.households.members).toEqual([
      expect.objectContaining({ householdId: id, userId: t.ana.id, role: 'OWNER', partnerSlot: 'PARTNER_1', displayName: 'Anita' }),
    ]);
    expect(t.households.categoriesSeededFor).toEqual([id]);
  });

  it('rejects a user who already has a household', async () => {
    const t = setup();
    await t.create.execute({ userId: t.ana.id }, { name: 'Casa' });
    await expect(t.create.execute({ userId: t.ana.id }, { name: 'Otra' })).rejects.toBeInstanceOf(AlreadyInHouseholdError);
  });
});

describe('CreateInviteUseCase', () => {
  it('stores a hashed token, emails the link and returns it', async () => {
    const t = setup();
    const ctx = await ownerCtx(t);
    const { invite, inviteUrl } = await t.invite.execute(ctx, { email: t.bruno.email });
    const raw = tokenFromLink(inviteUrl);
    expect(inviteUrl).toMatch(/^http:\/\/web\.test\/join\?token=/);
    expect(invite.tokenHash).toBe(hashToken(raw));
    expect(invite.expiresAt.getTime()).toBe(t.clock.now().getTime() + 7 * DAY);
    expect(t.mail.invites).toEqual([
      { to: t.bruno.email, inviterName: 'Ana', householdName: 'Casa', link: inviteUrl },
    ]);
  });

  it('replaces the previous pending invite', async () => {
    const t = setup();
    const ctx = await ownerCtx(t);
    await t.invite.execute(ctx, { email: t.bruno.email });
    await t.invite.execute(ctx, { email: t.carla.email });
    expect(t.invites.rows.map((r) => r.status)).toEqual(['REVOKED', 'PENDING']);
  });

  it('is OWNER-only, refuses self-invites and full households', async () => {
    const t = setup();
    const ctx = await ownerCtx(t);
    await expect(t.invite.execute({ ...ctx, role: 'MEMBER' }, { email: t.bruno.email })).rejects.toBeInstanceOf(OwnerOnlyError);
    await expect(t.invite.execute(ctx, { email: 'ANA@test.local' })).rejects.toBeInstanceOf(CannotInviteSelfError);
    await t.accept.execute({ userId: t.bruno.id }, { token: await inviteToken(t, ctx) });
    await expect(t.invite.execute(ctx, { email: t.carla.email })).rejects.toBeInstanceOf(HouseholdFullError);
  });
});

describe('AcceptInviteUseCase', () => {
  it('joins the inviting household as MEMBER / PARTNER_2', async () => {
    const t = setup();
    const ctx = await ownerCtx(t);
    const householdId = await t.accept.execute({ userId: t.bruno.id }, { token: await inviteToken(t, ctx) });
    expect(householdId).toBe(ctx.householdId);
    expect(t.households.members[1]).toMatchObject({ householdId, userId: t.bruno.id, role: 'MEMBER', partnerSlot: 'PARTNER_2' });
    expect(t.invites.rows[0].status).toBe('ACCEPTED');
  });

  it('rejects unknown, reused, revoked and expired tokens', async () => {
    const t = setup();
    const ctx = await ownerCtx(t);
    await expect(t.accept.execute({ userId: t.bruno.id }, { token: 'nope' })).rejects.toBeInstanceOf(InviteNotFoundError);

    const revoked = await inviteToken(t, ctx);
    await t.revoke.execute(ctx, t.invites.rows[0].id);
    await expect(t.accept.execute({ userId: t.bruno.id }, { token: revoked })).rejects.toBeInstanceOf(InviteNotUsableError);

    const expiring = await inviteToken(t, ctx);
    t.clock.advance(7 * DAY);
    await expect(t.accept.execute({ userId: t.bruno.id }, { token: expiring })).rejects.toBeInstanceOf(InviteNotUsableError);
  });

  it('requires the invited email and refuses users already in a household', async () => {
    const t = setup();
    const ctx = await ownerCtx(t);
    const token = await inviteToken(t, ctx);
    await expect(t.accept.execute({ userId: t.carla.id }, { token })).rejects.toBeInstanceOf(InviteEmailMismatchError);
    await expect(t.accept.execute({ userId: t.ana.id }, { token })).rejects.toBeInstanceOf(AlreadyInHouseholdError);
    await t.accept.execute({ userId: t.bruno.id }, { token });
    await expect(t.accept.execute({ userId: t.bruno.id }, { token })).rejects.toBeInstanceOf(AlreadyInHouseholdError);
  });
});

describe('RevokeInviteUseCase', () => {
  it('only finds invites of the caller household', async () => {
    const t = setup();
    const ctx = await ownerCtx(t);
    await inviteToken(t, ctx);
    const inviteId = t.invites.rows[0].id;
    const otherHousehold = await t.create.execute({ userId: t.carla.id }, { name: 'Otra' });
    const otherCtx: HouseholdContext = { userId: t.carla.id, householdId: otherHousehold, partnerSlot: 'PARTNER_1', role: 'OWNER' };
    await expect(t.revoke.execute(otherCtx, inviteId)).rejects.toBeInstanceOf(InviteNotFoundError);
    await expect(t.revoke.execute({ ...ctx, role: 'MEMBER' }, inviteId)).rejects.toBeInstanceOf(OwnerOnlyError);
    await t.revoke.execute(ctx, inviteId);
    expect(t.invites.rows[0].status).toBe('REVOKED');
    await expect(t.revoke.execute(ctx, inviteId)).rejects.toBeInstanceOf(InviteNotUsableError);
  });
});

describe('settings and member display', () => {
  it('updates only the caller household / member', async () => {
    const t = setup();
    const ctx = await ownerCtx(t);
    const other = await t.create.execute({ userId: t.carla.id }, { name: 'Otra' });
    await t.updateSettings.execute(ctx, { defaultSplitPartner1Percent: 60, name: 'Casa Nueva' });
    await t.updateMember.execute(ctx, { displayColor: '#123456', displayName: null });
    expect(await t.households.findById(ctx.householdId)).toMatchObject({ name: 'Casa Nueva', defaultSplitPartner1Percent: 60 });
    expect(await t.households.findById(other)).toMatchObject({ name: 'Otra', defaultSplitPartner1Percent: 50 });
    expect(t.households.members[0]).toMatchObject({ displayColor: '#123456', displayName: null });
  });
});
