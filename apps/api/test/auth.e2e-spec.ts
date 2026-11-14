import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { apiErrorSchema, authSessionResponseSchema, currentUserResponseSchema } from '@tandem/shared';
import { tokenFromLink } from '../src/common/testing/fakes';
import { bearer, cookieHeader, createE2eApp, CSRF, E2eContext, PASSWORD, refreshCookieOf, registerUser, setCookieHeader } from './helpers';

describe('Auth (e2e)', () => {
  let ctx: E2eContext;
  beforeAll(async () => (ctx = await createE2eApp('auth')));
  afterAll(() => ctx.close());

  const refresh = (token?: string) => {
    const req = request(ctx.http).post('/api/auth/refresh').set(CSRF);
    return token ? req.set('Cookie', cookieHeader(token)) : req;
  };

  describe('register', () => {
    it('creates the user, returns a session without passwordHash, and sets the refresh cookie', async () => {
      const email = ctx.email('reg');
      const res = await request(ctx.http)
        .post('/api/auth/register')
        .send({ name: '  Ana  ', email: email.toUpperCase(), password: PASSWORD })
        .expect(201);
      const body = authSessionResponseSchema.parse(res.body);
      expect(body.user).toMatchObject({ name: 'Ana', email });
      expect(body.household).toBeNull();
      expect(body.expiresIn).toBe(900);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);

      const cookie = setCookieHeader(res);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/Path=\/api\/auth/);
      expect(cookie).toMatch(/SameSite=Lax/);

      const row = await ctx.prisma.user.findUniqueOrThrow({ where: { email } });
      expect(row.passwordHash).toMatch(/^\$argon2id\$/);
      const tokens = await ctx.prisma.refreshToken.findMany({ where: { userId: row.id } });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].tokenHash).not.toBe(refreshCookieOf(res));
    });

    it('rejects a duplicate email with 409 EMAIL_TAKEN', async () => {
      const u = await registerUser(ctx, 'dup');
      const res = await request(ctx.http).post('/api/auth/register').send({ name: 'X', email: u.email, password: PASSWORD }).expect(409);
      expect(apiErrorSchema.parse(res.body)).toMatchObject({ statusCode: 409, error: 'EMAIL_TAKEN' });
    });

    it('validates input with 400 + issues', async () => {
      const res = await request(ctx.http).post('/api/auth/register').send({ name: '', email: 'nope', password: 'short' }).expect(400);
      const body = apiErrorSchema.parse(res.body);
      expect(body.error).toBe('VALIDATION_FAILED');
      expect(body.issues?.map((i) => i.path).sort()).toEqual(['email', 'name', 'password']);
    });
  });

  describe('login + access token', () => {
    it('logs in with valid credentials and the token opens GET /auth/me', async () => {
      const u = await registerUser(ctx, 'login');
      const res = await request(ctx.http).post('/api/auth/login').send({ email: u.email, password: PASSWORD }).expect(200);
      const body = authSessionResponseSchema.parse(res.body);
      expect(refreshCookieOf(res)).toBeDefined();
      const me = await request(ctx.http).get('/api/auth/me').set(bearer(body.accessToken)).expect(200);
      expect(currentUserResponseSchema.parse(me.body)).toMatchObject({ user: { id: u.id, email: u.email }, household: null });
    });

    it('rejects wrong password and unknown email identically (401)', async () => {
      const u = await registerUser(ctx, 'badlogin');
      const a = await request(ctx.http).post('/api/auth/login').send({ email: u.email, password: 'wrong-password' }).expect(401);
      const b = await request(ctx.http).post('/api/auth/login').send({ email: ctx.email('ghost'), password: PASSWORD }).expect(401);
      expect(a.body).toEqual(b.body);
      expect(a.body).toMatchObject({ error: 'INVALID_CREDENTIALS' });
      expect(refreshCookieOf(a)).toBeUndefined();
    });

    it('protected routes reject missing, malformed, forged and expired tokens', async () => {
      const u = await registerUser(ctx, 'guard');
      await request(ctx.http).get('/api/auth/me').expect(401);
      await request(ctx.http).get('/api/auth/me').set('Authorization', 'Basic abc').expect(401);
      await request(ctx.http).get('/api/auth/me').set(bearer('not-a-jwt')).expect(401);
      const forged = await new JwtService().signAsync({ sub: u.id }, { secret: 'x'.repeat(40), expiresIn: 900 });
      await request(ctx.http).get('/api/auth/me').set(bearer(forged)).expect(401);
      const expired = await new JwtService().signAsync(
        { sub: u.id, iat: Math.floor(Date.now() / 1000) - 3600 },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: 60 },
      );
      const res = await request(ctx.http).get('/api/auth/me').set(bearer(expired)).expect(401);
      expect(res.body).toMatchObject({ statusCode: 401, error: 'UNAUTHENTICATED' });
    });

    it('health stays public', async () => {
      await request(ctx.http).get('/api/health').expect(200);
    });
  });

  describe('refresh rotation', () => {
    it('requires the X-Requested-With header', async () => {
      const u = await registerUser(ctx, 'csrf');
      const res = await request(ctx.http).post('/api/auth/refresh').set('Cookie', cookieHeader(u.refreshToken)).expect(403);
      expect(res.body).toMatchObject({ error: 'CSRF_HEADER_MISSING' });
      await request(ctx.http).post('/api/auth/logout').set('Cookie', cookieHeader(u.refreshToken)).expect(403);
    });

    it('rotates the cookie and returns a new access token', async () => {
      const u = await registerUser(ctx, 'rotate');
      const res = await refresh(u.refreshToken).expect(200);
      const body = authSessionResponseSchema.parse(res.body);
      const next = refreshCookieOf(res);
      expect(next).toBeDefined();
      expect(next).not.toBe(u.refreshToken);
      await request(ctx.http).get('/api/auth/me').set(bearer(body.accessToken)).expect(200);
      await refresh(next).expect(200);
    });

    it('reuse of a rotated token revokes the whole family (401 + cookie cleared)', async () => {
      const u = await registerUser(ctx, 'reuse');
      const r1 = await refresh(u.refreshToken).expect(200);
      const t2 = refreshCookieOf(r1)!;

      const reuse = await refresh(u.refreshToken).expect(401);
      expect(reuse.body).toMatchObject({ error: 'INVALID_REFRESH_TOKEN' });
      expect(setCookieHeader(reuse)).toMatch(/tandem_rt=;/);
      // The newest legit token died with its family.
      await refresh(t2).expect(401);
      const active = await ctx.prisma.refreshToken.count({ where: { userId: u.id, revokedAt: null } });
      expect(active).toBe(0);
    });

    it('rejects a missing or unknown cookie', async () => {
      await refresh().expect(401);
      await refresh('made-up-token').expect(401);
    });
  });

  describe('logout', () => {
    it('revokes the session and clears the cookie; works without an access token', async () => {
      const u = await registerUser(ctx, 'logout');
      const res = await request(ctx.http).post('/api/auth/logout').set(CSRF).set('Cookie', cookieHeader(u.refreshToken)).expect(204);
      expect(setCookieHeader(res)).toMatch(/tandem_rt=;/);
      await refresh(u.refreshToken).expect(401);
      await request(ctx.http).post('/api/auth/logout').set(CSRF).expect(204);
    });
  });

  describe('password reset', () => {
    it('answers identically for known and unknown emails', async () => {
      const u = await registerUser(ctx, 'enum');
      const before = ctx.mail.resets.length;
      const known = await request(ctx.http).post('/api/auth/forgot-password').send({ email: u.email }).expect(202);
      const unknown = await request(ctx.http).post('/api/auth/forgot-password').send({ email: ctx.email('nobody') }).expect(202);
      expect(known.body).toEqual(unknown.body);
      expect(ctx.mail.resets.length).toBe(before + 1);
    });

    it('resets the password once, revokes existing sessions, and stores only a hash', async () => {
      const u = await registerUser(ctx, 'reset');
      await request(ctx.http).post('/api/auth/forgot-password').send({ email: u.email }).expect(202);
      const mail = ctx.mail.resets.filter((m) => m.to === u.email).pop()!;
      const token = tokenFromLink(mail.link);
      expect(mail.link.startsWith(`${process.env.WEB_APP_URL ?? 'http://localhost:5173'}/reset-password?token=`)).toBe(true);
      const stored = await ctx.prisma.passwordResetToken.findFirstOrThrow({ where: { userId: u.id } });
      expect(stored.tokenHash).not.toBe(token);

      await request(ctx.http).post('/api/auth/reset-password').send({ token, password: 'brand-new-pass' }).expect(204);
      await request(ctx.http).post('/api/auth/login').send({ email: u.email, password: PASSWORD }).expect(401);
      await request(ctx.http).post('/api/auth/login').send({ email: u.email, password: 'brand-new-pass' }).expect(200);
      await refresh(u.refreshToken).expect(401);

      const again = await request(ctx.http).post('/api/auth/reset-password').send({ token, password: 'other-pass-123' }).expect(422);
      expect(again.body).toMatchObject({ error: 'INVALID_RESET_TOKEN' });
      await request(ctx.http).post('/api/auth/reset-password').send({ token: 'bogus', password: 'other-pass-123' }).expect(422);
    });
  });

  describe('profile', () => {
    it('PATCH /auth/me renames only the caller', async () => {
      const a = await registerUser(ctx, 'prof-a', 'A');
      const b = await registerUser(ctx, 'prof-b', 'B');
      const res = await request(ctx.http).patch('/api/auth/me').set(bearer(a.accessToken)).send({ name: 'Ana Renamed', id: b.id }).expect(200);
      expect(res.body.user).toMatchObject({ id: a.id, name: 'Ana Renamed' });
      const other = await request(ctx.http).get('/api/auth/me').set(bearer(b.accessToken)).expect(200);
      expect(other.body.user.name).toBe('B');
      await request(ctx.http).patch('/api/auth/me').set(bearer(a.accessToken)).send({ name: '' }).expect(400);
      await request(ctx.http).patch('/api/auth/me').send({ name: 'x' }).expect(401);
    });
  });
});
