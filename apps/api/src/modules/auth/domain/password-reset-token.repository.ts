export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export abstract class PasswordResetTokenRepository {
  /** Invalidates the user's earlier unused tokens, then stores the new one. */
  abstract replaceForUser(token: { userId: string; tokenHash: string; expiresAt: Date }, at: Date): Promise<void>;
  abstract findByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  /**
   * In one DB transaction: mark the token used (only if still unused), set the new password hash,
   * invalidate the user's other reset tokens and revoke all their refresh tokens.
   * Returns false if the token was already used (nothing changes).
   */
  abstract consumeAndSetPassword(tokenId: string, userId: string, passwordHash: string, at: Date): Promise<boolean>;
}
