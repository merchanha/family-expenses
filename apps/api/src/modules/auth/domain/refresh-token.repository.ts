export interface RefreshTokenRecord {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
  createdAt: Date;
}

export interface NewRefreshToken {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}

export abstract class RefreshTokenRepository {
  abstract create(token: NewRefreshToken): Promise<RefreshTokenRecord>;
  abstract findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  /**
   * Atomically revoke `currentId` (only if still active) and create its replacement.
   * Returns null when `currentId` was already revoked (concurrent reuse) — nothing is created.
   */
  abstract rotate(currentId: string, replacement: NewRefreshToken, at: Date): Promise<RefreshTokenRecord | null>;
  abstract revokeFamily(familyId: string, at: Date): Promise<void>;
}
