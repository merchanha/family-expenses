import { FixedClock, RecordingMailService, tokenFromLink } from '../../../common/testing/fakes';
import { hashToken } from '../../../common/secure-token';
import {
  FakeAccessTokens,
  FakePasswordHasher,
  InMemoryPasswordResetTokenRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from '../__tests__/fakes';
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  InvalidResetTokenError,
} from '../domain/auth.errors';
import { AuthSettings } from '../domain/auth-settings';
import { LoginUseCase } from './login.use-case';
import { LogoutUseCase } from './logout.use-case';
import { RefreshSessionUseCase } from './refresh-session.use-case';
import { RegisterUseCase } from './register.use-case';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { SessionIssuer } from './session-issuer';
import { UpdateProfileUseCase } from './update-profile.use-case';

const DAY = 86_400_000;

function setup() {
  const clock = new FixedClock();
  const users = new InMemoryUserRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const resetTokens = new InMemoryPasswordResetTokenRepository(users, refreshTokens);
  const hasher = new FakePasswordHasher();
  const mail = new RecordingMailService();
  const settings = new AuthSettings(30, 30, 'http://web.test');
  const sessions = new SessionIssuer(refreshTokens, new FakeAccessTokens(), settings, clock);
  return {
    clock,
    users,
    refreshTokens,
    resetTokens,
    mail,
    register: new RegisterUseCase(users, hasher, sessions),
    login: new LoginUseCase(users, hasher, sessions),
    refresh: new RefreshSessionUseCase(refreshTokens, sessions, clock),
    logout: new LogoutUseCase(refreshTokens, clock),
    requestReset: new RequestPasswordResetUseCase(users, resetTokens, mail, settings, clock),
    resetPassword: new ResetPasswordUseCase(resetTokens, hasher, clock),
    updateProfile: new UpdateProfileUseCase(users),
  };
}

const ana = { name: 'Ana', email: 'ana@test.local', password: 'correct-horse' };

describe('RegisterUseCase', () => {
  it('creates the user with a hashed password and starts a session', async () => {
    const t = setup();
    const session = await t.register.execute(ana);
    const user = await t.users.findByEmail(ana.email);
    expect(user?.passwordHash).toBe('hashed:correct-horse');
    expect(session).toMatchObject({ userId: user!.id, accessToken: `access:${user!.id}`, expiresIn: 900 });
    // Only the hash of the refresh token is stored.
    expect(t.refreshTokens.rows).toHaveLength(1);
    expect(t.refreshTokens.rows[0].tokenHash).toBe(hashToken(session.refreshToken));
    expect(session.refreshTokenExpiresAt.getTime()).toBe(t.clock.now().getTime() + 30 * DAY);
  });

  it('rejects a duplicate email', async () => {
    const t = setup();
    await t.register.execute(ana);
    await expect(t.register.execute({ ...ana, name: 'Other' })).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });
});

describe('LoginUseCase', () => {
  it('starts a new token family on valid credentials', async () => {
    const t = setup();
    const first = await t.register.execute(ana);
    const second = await t.login.execute({ email: ana.email, password: ana.password });
    expect(second.userId).toBe(first.userId);
    const [a, b] = t.refreshTokens.rows;
    expect(a.familyId).not.toBe(b.familyId);
  });

  it.each([
    ['wrong password', { email: ana.email, password: 'nope-nope' }],
    ['unknown email', { email: 'ghost@test.local', password: ana.password }],
  ])('rejects %s with the same error', async (_label, input) => {
    const t = setup();
    await t.register.execute(ana);
    await expect(t.login.execute(input)).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});

describe('RefreshSessionUseCase', () => {
  it('rotates: revokes the old token, issues a new one in the same family', async () => {
    const t = setup();
    const s1 = await t.register.execute(ana);
    const s2 = await t.refresh.execute(s1.refreshToken);
    expect(s2.refreshToken).not.toBe(s1.refreshToken);
    const old = await t.refreshTokens.findByHash(hashToken(s1.refreshToken));
    const next = await t.refreshTokens.findByHash(hashToken(s2.refreshToken));
    expect(old?.revokedAt).not.toBeNull();
    expect(old?.replacedById).toBe(next?.id);
    expect(next?.familyId).toBe(old?.familyId);
    expect(next?.revokedAt).toBeNull();
  });

  it('detects reuse of a rotated token and revokes the whole family', async () => {
    const t = setup();
    const s1 = await t.register.execute(ana);
    const s2 = await t.refresh.execute(s1.refreshToken);
    await expect(t.refresh.execute(s1.refreshToken)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    // The legit newest token is now dead too.
    await expect(t.refresh.execute(s2.refreshToken)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(t.refreshTokens.rows.every((r) => r.revokedAt)).toBe(true);
  });

  it('does not touch other families (other devices) on reuse', async () => {
    const t = setup();
    const phone = await t.register.execute(ana);
    const laptop = await t.login.execute({ email: ana.email, password: ana.password });
    await t.refresh.execute(phone.refreshToken);
    await expect(t.refresh.execute(phone.refreshToken)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    await expect(t.refresh.execute(laptop.refreshToken)).resolves.toMatchObject({ userId: laptop.userId });
  });

  it('rejects missing, unknown and expired tokens', async () => {
    const t = setup();
    const s1 = await t.register.execute(ana);
    await expect(t.refresh.execute(undefined)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    await expect(t.refresh.execute('garbage')).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    t.clock.advance(30 * DAY);
    await expect(t.refresh.execute(s1.refreshToken)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
  });
});

describe('LogoutUseCase', () => {
  it('revokes the session family and is idempotent', async () => {
    const t = setup();
    const s1 = await t.register.execute(ana);
    await t.logout.execute(s1.refreshToken);
    await t.logout.execute(s1.refreshToken);
    await t.logout.execute(undefined);
    await expect(t.refresh.execute(s1.refreshToken)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
  });
});

describe('password reset', () => {
  it('sends a link for known emails only, with the same outcome either way', async () => {
    const t = setup();
    await t.register.execute(ana);
    await expect(t.requestReset.execute({ email: 'ghost@test.local' })).resolves.toBeUndefined();
    expect(t.mail.resets).toHaveLength(0);
    await expect(t.requestReset.execute({ email: ana.email })).resolves.toBeUndefined();
    expect(t.mail.resets).toHaveLength(1);
    expect(t.mail.resets[0].link).toMatch(/^http:\/\/web\.test\/reset-password\?token=/);
    // Stored hashed, never raw.
    const raw = tokenFromLink(t.mail.resets[0].link);
    expect(t.resetTokens.rows[0].tokenHash).toBe(hashToken(raw));
  });

  it('updates the password, revokes sessions, and is single-use', async () => {
    const t = setup();
    const session = await t.register.execute(ana);
    await t.requestReset.execute({ email: ana.email });
    const token = tokenFromLink(t.mail.resets[0].link);

    await t.resetPassword.execute({ token, password: 'new-password-1' });
    await expect(t.login.execute({ email: ana.email, password: ana.password })).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(t.login.execute({ email: ana.email, password: 'new-password-1' })).resolves.toBeDefined();
    await expect(t.refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    await expect(t.resetPassword.execute({ token, password: 'another-pass' })).rejects.toBeInstanceOf(InvalidResetTokenError);
  });

  it('invalidates older links when a new one is requested, and expires links', async () => {
    const t = setup();
    await t.register.execute(ana);
    await t.requestReset.execute({ email: ana.email });
    await t.requestReset.execute({ email: ana.email });
    const [older, newer] = t.mail.resets.map((m) => tokenFromLink(m.link));
    await expect(t.resetPassword.execute({ token: older, password: 'new-password-1' })).rejects.toBeInstanceOf(InvalidResetTokenError);
    t.clock.advance(30 * 60_000);
    await expect(t.resetPassword.execute({ token: newer, password: 'new-password-1' })).rejects.toBeInstanceOf(InvalidResetTokenError);
    await expect(t.resetPassword.execute({ token: 'unknown', password: 'new-password-1' })).rejects.toBeInstanceOf(InvalidResetTokenError);
  });
});

describe('UpdateProfileUseCase', () => {
  it('renames the caller', async () => {
    const t = setup();
    const s = await t.register.execute(ana);
    await t.updateProfile.execute({ userId: s.userId }, { name: 'Ana María' });
    expect((await t.users.findById(s.userId))?.name).toBe('Ana María');
  });
});
