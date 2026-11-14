import type { HouseholdMemberRole, InviteStatus, PartnerSlot } from '@tandem/shared';

export interface HouseholdRecord {
  id: string;
  name: string;
  defaultCurrency: string;
  timezone: string;
  defaultSplitPartner1Percent: number;
  createdAt: Date;
}

export interface InviteRecord {
  id: string;
  householdId: string;
  email: string;
  tokenHash: string;
  status: InviteStatus;
  invitedById: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface UserIdentity {
  id: string;
  name: string;
  email: string;
}

export interface NewMember {
  userId: string;
  role: HouseholdMemberRole;
  partnerSlot: PartnerSlot;
  displayName: string | null;
  displayColor: string | null;
}
