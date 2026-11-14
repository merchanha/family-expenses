import type { CurrentHouseholdResponse, HouseholdMember, PartnerSlot, SessionHousehold } from '@tandem/shared';

export const PARTNER_SLOT_LABEL: Record<PartnerSlot, string> = {
  PARTNER_1: 'Partner 1',
  PARTNER_2: 'Partner 2',
};

/** Name shown on chips and filters: the member's display name, else their account name. */
export function memberLabel(member: Pick<HouseholdMember, 'displayName' | 'name'>): string {
  return member.displayName?.trim() || member.name;
}

export function memberInitials(member: Pick<HouseholdMember, 'displayName' | 'name'>): string {
  const words = memberLabel(member).split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0]![0], words[words.length - 1]![0]] : [words[0]?.[0]];
  return letters.filter(Boolean).join('').toUpperCase();
}

/** "50/50", "60/40" — Partner 1 share first (default split, display/planning only). */
export function splitLabel(partner1Percent: number): string {
  return `${partner1Percent}/${100 - partner1Percent}`;
}

export function memberBySlot(data: CurrentHouseholdResponse, slot: PartnerSlot): HouseholdMember | undefined {
  return data.members.find((m) => m.partnerSlot === slot);
}

/** Session summary derived from a household response (after create / accept invite). */
export function toSessionHousehold(data: CurrentHouseholdResponse): SessionHousehold {
  return {
    id: data.household.id,
    name: data.household.name,
    partnerSlot: data.me.partnerSlot,
    role: data.me.role,
  };
}
