import type { HouseholdRecord, NewMember, UserIdentity } from './household';

export interface NewHousehold {
  name: string;
  defaultCurrency: string;
  timezone: string;
  owner: NewMember;
}

export interface HouseholdPatch {
  name?: string;
  defaultSplitPartner1Percent?: number;
  defaultCurrency?: string;
  timezone?: string;
}

export interface MemberPatch {
  displayName?: string | null;
  displayColor?: string | null;
}

export abstract class HouseholdRepository {
  /** Household + owner membership + default categories, in one DB transaction. Returns the id. */
  abstract createWithOwner(household: NewHousehold): Promise<string>;
  abstract findById(householdId: string): Promise<HouseholdRecord | null>;
  abstract update(householdId: string, patch: HouseholdPatch): Promise<void>;
  abstract updateMember(householdId: string, userId: string, patch: MemberPatch): Promise<void>;
  abstract countMembers(householdId: string): Promise<number>;
  /** The household the user belongs to, if any (MVP: at most one). */
  abstract findHouseholdIdOfUser(userId: string): Promise<string | null>;
  abstract findUser(userId: string): Promise<UserIdentity | null>;
}
