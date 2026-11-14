import request from 'supertest';
import type { E2eContext } from './helpers';

/** Credential endpoints are rate-limited per IP (limit from env). Uses its own low limit. */
describe('Auth rate limiting (e2e)', () => {
  let ctx: E2eContext;
  const previous = process.env.AUTH_THROTTLE_LIMIT;
  beforeAll(async () => {
    process.env.AUTH_THROTTLE_LIMIT = '3';
    // Import after setting env: ConfigModule validates env when AppModule is first loaded.
    const { createE2eApp } = await import('./helpers');
    ctx = await createE2eApp('throttle');
  });
  afterAll(async () => {
    await ctx.close();
    process.env.AUTH_THROTTLE_LIMIT = previous;
  });

  it('returns 429 TOO_MANY_REQUESTS after the limit', async () => {
    const send = () => request(ctx.http).post('/api/auth/login').send({ email: ctx.email('x'), password: 'whatever-1' });
    for (let i = 0; i < 3; i++) expect((await send()).status).toBe(401);
    const res = await send().expect(429);
    expect(res.body).toMatchObject({ statusCode: 429, error: 'TOO_MANY_REQUESTS' });
    // Non-credential routes are not throttled.
    await request(ctx.http).get('/api/health').expect(200);
  });
});
