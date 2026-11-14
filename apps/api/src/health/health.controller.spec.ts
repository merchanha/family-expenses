import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { healthResponseSchema } from '@tandem/shared';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('GET /api/health', () => {
  let app: INestApplication;
  const prisma = { $queryRaw: jest.fn() };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });
  afterAll(() => app.close());

  it('returns 200 + db up when the database responds', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    const body = healthResponseSchema.parse(res.body);
    expect(body).toMatchObject({ status: 'ok', db: 'up' });
  });

  it('returns 503 + db down when the database fails', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = await request(app.getHttpServer()).get('/api/health').expect(503);
    expect(healthResponseSchema.parse(res.body)).toMatchObject({ status: 'error', db: 'down' });
  });
});
