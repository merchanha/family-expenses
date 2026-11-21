import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { authSessionResponseSchema, CSRF_HEADER_NAME, CSRF_HEADER_VALUE, REFRESH_COOKIE_NAME } from '@tandem/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/common/mail/mail.service';
import { RecordingMailService } from '../src/common/testing/fakes';

export const CSRF = { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE };
export const PASSWORD = 'e2e-password-123';

export interface E2eContext {
  app: INestApplication;
  http: ReturnType<INestApplication['getHttpServer']>;
  mail: RecordingMailService;
  prisma: PrismaClient;
  /** Unique per suite run; every email created contains it so cleanup is exact. */
  prefix: string;
  email(label: string): string;
  close(): Promise<void>;
}

export async function createE2eApp(suite: string): Promise<E2eContext> {
  const mail = new RecordingMailService();
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .compile();
  const app = mod.createNestApplication({ logger: ['error'] });
  configureApp(app);
  await app.init();
  const prisma = new PrismaClient();
  const prefix = `e2e-${suite}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    app,
    http: app.getHttpServer(),
    mail,
    prisma,
    prefix,
    email: (label) => `${prefix}-${label}@test.local`,
    async close() {
      // Only rows this suite created: households of our users (cascades members/invites/categories), then users.
      const where = { email: { startsWith: prefix } };
      await prisma.household.deleteMany({ where: { members: { some: { user: where } } } });
      await prisma.user.deleteMany({ where });
      await prisma.$disconnect();
      await app.close();
    },
  };
}

/** The raw refresh cookie value from a response, or undefined. */
export function refreshCookieOf(res: request.Response): string | undefined {
  const raw = res.headers['set-cookie'] as unknown;
  const list = Array.isArray(raw) ? (raw as string[]) : typeof raw === 'string' ? [raw] : [];
  const hit = list.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
  return hit?.split(';')[0].slice(REFRESH_COOKIE_NAME.length + 1) || undefined;
}

export function setCookieHeader(res: request.Response): string {
  const raw = res.headers['set-cookie'] as unknown;
  const list = Array.isArray(raw) ? (raw as string[]) : [];
  return list.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`)) ?? '';
}

export const cookieHeader = (token: string) => `${REFRESH_COOKIE_NAME}=${token}`;
export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(ctx: E2eContext, label: string, name = label): Promise<TestUser> {
  const email = ctx.email(label);
  const res = await request(ctx.http).post('/api/auth/register').send({ name, email, password: PASSWORD }).expect(201);
  const body = authSessionResponseSchema.parse(res.body);
  return { id: body.user.id, email, accessToken: body.accessToken, refreshToken: refreshCookieOf(res)! };
}

export async function createHousehold(ctx: E2eContext, user: TestUser, name: string): Promise<string> {
  const res = await request(ctx.http).post('/api/households').set(bearer(user.accessToken)).send({ name }).expect(201);
  return res.body.household.id as string;
}

/** Owner invites partner by email; returns the raw invite token from the returned link. */
export async function invite(ctx: E2eContext, owner: TestUser, email: string): Promise<{ id: string; token: string }> {
  const res = await request(ctx.http).post('/api/households/me/invites').set(bearer(owner.accessToken)).send({ email }).expect(201);
  return { id: res.body.invite.id, token: new URL(res.body.inviteUrl as string).searchParams.get('token')! };
}

export async function acceptInvite(ctx: E2eContext, user: TestUser, token: string): Promise<void> {
  await request(ctx.http).post('/api/invites/accept').set(bearer(user.accessToken)).send({ token }).expect(200);
}

/** An active category of the caller's household (defaults are seeded on household create). */
export async function categoryId(ctx: E2eContext, user: TestUser, type: 'INCOME' | 'EXPENSE', name?: string): Promise<string> {
  const res = await request(ctx.http).get(`/api/categories?type=${type}`).set(bearer(user.accessToken)).expect(200);
  const items = res.body.items as { id: string; name: string }[];
  const hit = name ? items.find((c) => c.name === name) : items[0];
  if (!hit) throw new Error(`No ${type} category ${name ?? ''}`);
  return hit.id;
}

export interface TxBody {
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: string;
  categoryId: string;
  transactionDate: string;
  paidById?: string | null;
  notes?: string | null;
}

/** POST /transactions (expects 201); returns the created id. */
export async function createTx(ctx: E2eContext, user: TestUser, body: TxBody): Promise<string> {
  const res = await request(ctx.http).post('/api/transactions').set(bearer(user.accessToken)).send(body).expect(201);
  return res.body.id as string;
}
