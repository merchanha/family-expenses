import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().url(),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    /** Public web origin used to build links in emails (reset password, invites). */
    WEB_APP_URL: z.string().url().default('http://localhost:5173'),
    JWT_ACCESS_SECRET: z.string().min(32),
    /** Unused since P1 (refresh tokens are opaque + hashed, Decision #5). Kept optional for old .env files. */
    JWT_REFRESH_SECRET: z.string().min(32).optional(),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    REFRESH_COOKIE_SECURE: booleanString.default('false'),
    REFRESH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
    INVITE_TTL_DAYS: z.coerce.number().int().positive().default(7),
    /** Per-IP limit on credential endpoints (in-memory, per instance — acceptable for MVP). */
    AUTH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(10),
    /** Per-IP limit on POST /auth/refresh, same window as AUTH_THROTTLE_TTL_SECONDS. */
    AUTH_REFRESH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
    AUTH_THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  })
  .refine((e) => e.REFRESH_COOKIE_SAMESITE !== 'none' || e.REFRESH_COOKIE_SECURE, {
    message: 'REFRESH_COOKIE_SAMESITE=none requires REFRESH_COOKIE_SECURE=true',
    path: ['REFRESH_COOKIE_SECURE'],
  });
export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}
