import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { Env } from './config/env';

/** HTTP setup shared by main.ts and e2e tests so both run the same pipeline. */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.setGlobalPrefix('api');
  // Behind Cloud Run / the Vite proxy: trust one hop so req.ip (rate limiting) is the client IP.
  (app as NestExpressApplication).set('trust proxy', 1);
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }).split(',').map((o) => o.trim()),
    credentials: true,
    // Cross-site (Pages → Run): let the web read throttle backoff. Named throttlers suffix the
    // header, so refresh sends `Retry-After-refresh` (FOR-105).
    exposedHeaders: ['Retry-After', 'Retry-After-refresh'],
  });
}
