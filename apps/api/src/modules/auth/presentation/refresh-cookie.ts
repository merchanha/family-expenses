import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { REFRESH_COOKIE_NAME } from '@tandem/shared';
import type { Env } from '../../../config/env';

/** httpOnly refresh cookie `tandem_rt`, scoped to /api/auth. Secure/SameSite from env. */
@Injectable()
export class RefreshCookie {
  private readonly base: CookieOptions;

  constructor(config: ConfigService<Env, true>) {
    this.base = {
      httpOnly: true,
      secure: config.get('REFRESH_COOKIE_SECURE', { infer: true }),
      sameSite: config.get('REFRESH_COOKIE_SAMESITE', { infer: true }),
      path: '/api/auth',
    };
  }

  read(req: Request): string | undefined {
    const cookies: unknown = req.cookies;
    if (typeof cookies !== 'object' || cookies === null) return undefined;
    const value = (cookies as Record<string, unknown>)[REFRESH_COOKIE_NAME];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  set(res: Response, token: string, expiresAt: Date): void {
    res.cookie(REFRESH_COOKIE_NAME, token, { ...this.base, expires: expiresAt });
  }

  clear(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, this.base);
  }
}
