import type { Household, HouseholdInvite, HouseholdMember } from '@tandem/shared';
import type { HouseholdMember as MemberRow, HouseholdInvite as InviteRow } from '@prisma/client';
import type { HouseholdRecord } from '../domain/household';

export const toHouseholdResponse = (h: HouseholdRecord): Household => ({
  id: h.id,
  name: h.name,
  defaultCurrency: h.defaultCurrency,
  timezone: h.timezone,
  defaultSplitPartner1Percent: h.defaultSplitPartner1Percent,
  createdAt: h.createdAt.toISOString(),
});

export const toMemberResponse = (m: MemberRow & { user: { name: string; email: string } }): HouseholdMember => ({
  id: m.id,
  userId: m.userId,
  name: m.user.name,
  email: m.user.email,
  role: m.role,
  partnerSlot: m.partnerSlot,
  displayName: m.displayName,
  displayColor: m.displayColor,
  joinedAt: m.joinedAt.toISOString(),
});

/** Never includes tokenHash. */
export const toInviteResponse = (i: Pick<InviteRow, 'id' | 'email' | 'status' | 'invitedById' | 'expiresAt' | 'createdAt'>): HouseholdInvite => ({
  id: i.id,
  email: i.email,
  status: i.status,
  invitedById: i.invitedById,
  expiresAt: i.expiresAt.toISOString(),
  createdAt: i.createdAt.toISOString(),
});
