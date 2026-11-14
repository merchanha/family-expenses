import type { InviteRecord, NewMember } from './household';

export interface NewInvite {
  householdId: string;
  email: string;
  tokenHash: string;
  invitedById: string;
  expiresAt: Date;
}

export abstract class InviteRepository {
  /** Revokes the household's pending invites and creates the new one, atomically. */
  abstract replacePending(invite: NewInvite): Promise<InviteRecord>;
  abstract findByTokenHash(tokenHash: string): Promise<InviteRecord | null>;
  /** Always scoped by householdId: another household's invite is "not found". */
  abstract findById(householdId: string, inviteId: string): Promise<InviteRecord | null>;
  abstract revoke(householdId: string, inviteId: string): Promise<void>;
  /**
   * Atomically mark the invite ACCEPTED (only if still PENDING and unexpired) and add the member.
   * Returns false if the invite was no longer usable. DB uniques guard slot/user races (→ 409).
   */
  abstract accept(inviteId: string, householdId: string, member: NewMember, at: Date): Promise<boolean>;
}
