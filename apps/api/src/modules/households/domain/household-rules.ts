import { MAX_HOUSEHOLD_MEMBERS, type HouseholdMemberRole } from '@tandem/shared';
import type { InviteRecord } from './household';
import {
  CannotInviteSelfError,
  HouseholdFullError,
  InviteEmailMismatchError,
  InviteNotUsableError,
  OwnerOnlyError,
} from './household.errors';

/** Pure household rules (BUSINESS_RULES §1): two partners, equal financial permissions. */

export function assertCanInvite(p: {
  role: HouseholdMemberRole;
  memberCount: number;
  inviterEmail: string;
  inviteeEmail: string;
}): void {
  if (p.role !== 'OWNER') throw new OwnerOnlyError();
  if (p.memberCount >= MAX_HOUSEHOLD_MEMBERS) throw new HouseholdFullError();
  if (p.inviterEmail.toLowerCase() === p.inviteeEmail.toLowerCase()) throw new CannotInviteSelfError();
}

export function isInviteUsable(invite: Pick<InviteRecord, 'status' | 'expiresAt'>, now: Date): boolean {
  return invite.status === 'PENDING' && invite.expiresAt.getTime() > now.getTime();
}

export function assertCanAcceptInvite(p: {
  invite: Pick<InviteRecord, 'status' | 'expiresAt' | 'email'>;
  userEmail: string;
  memberCount: number;
  now: Date;
}): void {
  if (!isInviteUsable(p.invite, p.now)) throw new InviteNotUsableError();
  if (p.invite.email.toLowerCase() !== p.userEmail.toLowerCase()) throw new InviteEmailMismatchError();
  if (p.memberCount >= MAX_HOUSEHOLD_MEMBERS) throw new HouseholdFullError();
}
