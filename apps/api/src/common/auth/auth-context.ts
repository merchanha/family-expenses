import type { HouseholdMemberRole, PartnerSlot } from '@tandem/shared';

/** Authenticated caller, from a verified access JWT. */
export interface AuthUserContext {
  userId: string;
}

/**
 * Caller + household membership, resolved server-side from HouseholdMember on every request.
 * Use cases take householdId ONLY from here — never from URL, query or body.
 */
export interface HouseholdContext extends AuthUserContext {
  householdId: string;
  partnerSlot: PartnerSlot;
  role: HouseholdMemberRole;
}

/** Shape attached to the Express request by JwtAuthGuard. */
export interface AuthenticatedRequestState {
  auth?: AuthUserContext;
  household?: HouseholdContext | null;
}
