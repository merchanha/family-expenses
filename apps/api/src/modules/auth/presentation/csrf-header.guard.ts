import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ApiErrorCode, CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from '@tandem/shared';

/**
 * Cookie-authenticated endpoints (/auth/refresh, /auth/logout) require `X-Requested-With: tandem`.
 * A custom header forces a CORS preflight, which only CORS_ORIGIN passes (Decision #5).
 */
@Injectable()
export class CsrfHeaderGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (req.header(CSRF_HEADER_NAME) !== CSRF_HEADER_VALUE) {
      throw new ForbiddenException({
        message: `Missing ${CSRF_HEADER_NAME} header`,
        error: ApiErrorCode.CSRF_HEADER_MISSING,
      });
    }
    return true;
  }
}
