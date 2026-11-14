import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthenticatedRequestState, AuthUserContext, HouseholdContext } from './auth-context';

export const IS_PUBLIC_KEY = 'tandem:isPublic';
export const ALLOW_WITHOUT_HOUSEHOLD_KEY = 'tandem:allowWithoutHousehold';

/** Opt a route out of authentication (health, register, login, refresh, ...). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Authenticated route that does NOT require a household (session bootstrap, create household,
 * accept invite). Every other authenticated route requires one → 403 HOUSEHOLD_REQUIRED.
 */
export const AllowWithoutHousehold = () => SetMetadata(ALLOW_WITHOUT_HOUSEHOLD_KEY, true);

type Req = AuthenticatedRequestState;

/** The authenticated user ({ userId }). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUserContext => {
  const auth = ctx.switchToHttp().getRequest<Req>().auth;
  if (!auth) throw new Error('CurrentUser used on a route without authentication');
  return auth;
});

/** The caller's household context. Only valid on household-scoped routes (the default). */
export const CurrentHousehold = createParamDecorator((_: unknown, ctx: ExecutionContext): HouseholdContext => {
  const household = ctx.switchToHttp().getRequest<Req>().household;
  if (!household) throw new Error('CurrentHousehold used on a route that allows no household');
  return household;
});
