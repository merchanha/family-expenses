import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiErrorCode } from '@tandem/shared';
import type { AuthenticatedRequestState } from '../../../common/auth/auth-context';
import { ALLOW_WITHOUT_HOUSEHOLD_KEY, IS_PUBLIC_KEY } from '../../../common/auth/auth.decorators';
import { AccessTokens } from '../domain/access-tokens';
import { PrismaMembershipLookup } from '../infrastructure/prisma-membership.lookup';

/**
 * Global guard (APP_GUARD). Secure by default:
 * 1. `@Public()` routes skip it.
 * 2. Otherwise requires a valid `Authorization: Bearer <access JWT>` → 401.
 * 3. Resolves household membership server-side and attaches it to the request. Routes without
 *    `@AllowWithoutHousehold()` require one → 403 HOUSEHOLD_REQUIRED (web routes to onboarding).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokens,
    private readonly memberships: PrismaMembershipLookup,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const req = ctx.switchToHttp().getRequest<Request & AuthenticatedRequestState>();
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
    const claims = token ? await this.accessTokens.verify(token) : null;
    if (!claims) {
      throw new UnauthorizedException({ message: 'Authentication required', error: ApiErrorCode.UNAUTHENTICATED });
    }
    req.auth = { userId: claims.userId };
    req.household = await this.memberships.findByUserId(claims.userId);

    if (!req.household && !this.reflector.getAllAndOverride<boolean>(ALLOW_WITHOUT_HOUSEHOLD_KEY, targets)) {
      throw new ForbiddenException({
        message: 'Create or join a household first',
        error: ApiErrorCode.HOUSEHOLD_REQUIRED,
      });
    }
    return true;
  }
}
