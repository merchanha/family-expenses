export interface IssuedAccessToken {
  accessToken: string;
  /** Seconds until expiry. */
  expiresIn: number;
}

/** Port for short-lived access JWTs. Claims are minimal: `sub` (userId), `iat`, `exp`. */
export abstract class AccessTokens {
  abstract issue(userId: string): Promise<IssuedAccessToken>;
  /** Returns the userId for a valid, unexpired token; null otherwise. */
  abstract verify(token: string): Promise<{ userId: string } | null>;
}
