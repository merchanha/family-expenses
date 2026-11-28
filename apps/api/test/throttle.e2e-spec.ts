import request from 'supertest';
import type { E2eContext } from './helpers';

/** Credential endpoints are rate-limited per IP (limit from env). Uses its own low limit. */
describe('Auth rate limiting (e2e)', () => {
  let ctx: E2eContext;
  let CSRF: Record<string, string>;
  const previous = process.env.AUTH_THROTTLE_LIMIT;
  const previousRefresh = process.env.AUTH_REFRESH_THROTTLE_LIMIT;
  beforeAll(async () => {
    process.env.AUTH_THROTTLE_LIMIT = '3';
    process.env.AUTH_REFRESH_THROTTLE_LIMIT = '6';
    // Import after setting env: ConfigModule validates env when AppModule is first loaded.
    const helpers = await import('./helpers');
    CSRF = helpers.CSRF;
    ctx = await helpers.createE2eApp('throttle');
  });
  afterAll(async () => {
    await ctx.close();
    process.env.AUTH_THROTTLE_LIMIT = previous;
    process.env.AUTH_REFRESH_THROTTLE_LIMIT = previousRefresh;
  });

  it('returns 429 TOO_MANY_REQUESTS after the limit', async () => {
    const send = () => request(ctx.http).post('/api/auth/login').send({ email: ctx.email('x'), password: 'whatever-1' });
    for (let i = 0; i < 3; i++) expect((await send()).status).toBe(401);
    const res = await send().expect(429);
    expect(res.body).toMatchObject({ statusCode: 429, error: 'TOO_MANY_REQUESTS' });
    // Non-credential routes are not throttled.
    await request(ctx.http).get('/api/health').expect(200);
  });

  it('gives refresh its own, higher limit that does not consume the login bucket (FOR-105)', async () => {
    // No cookie → 401 (invalid refresh token) until the refresh bucket (6) is spent.
    const refresh = () => request(ctx.http).post('/api/auth/refresh').set(CSRF);
    for (let i = 0; i < 6; i++) expect((await refresh()).status).toBe(401);
    const res = await refresh().expect(429);
    expect(res.body).toMatchObject({ statusCode: 429, error: 'TOO_MANY_REQUESTS' });
    expect(res.headers['retry-after-refresh']).toBeDefined();
    // Register keeps the strict limit (3) and its own counter.
    const register = (i: number) =>
      request(ctx.http).post('/api/auth/register').send({ email: ctx.email(`r${i}`), password: 'short' });
    for (let i = 0; i < 3; i++) expect((await register(i)).status).toBe(400);
    await register(3).expect(429);
  });
});
