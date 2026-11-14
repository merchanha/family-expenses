import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Clock } from '../../../common/clock';
import { generateOpaqueToken, hashToken } from '../../../common/secure-token';
import { AccessTokens } from '../domain/access-tokens';
import { AuthSettings } from '../domain/auth-settings';
import { NewRefreshToken, RefreshTokenRepository } from '../domain/refresh-token.repository';

/** What a successful register/login/refresh hands to the controller. */
export interface IssuedSession {
  userId: string;
  accessToken: string;
  expiresIn: number;
  /** Raw opaque refresh token — goes ONLY into the httpOnly cookie. */
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

/** Creates refresh-token rows + access tokens. Shared by register, login and refresh. */
@Injectable()
export class SessionIssuer {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly accessTokens: AccessTokens,
    private readonly settings: AuthSettings,
    private readonly clock: Clock,
  ) {}

  /** New login → new token family. */
  async start(userId: string): Promise<IssuedSession> {
    const { raw, record } = this.newToken(userId, randomUUID());
    await this.refreshTokens.create(record);
    return this.finish(userId, raw, record.expiresAt);
  }

  /** Build (but don't persist) the next token in a family, for rotation. */
  nextInFamily(userId: string, familyId: string): { raw: string; record: NewRefreshToken } {
    return this.newToken(userId, familyId);
  }

  async finish(userId: string, rawRefreshToken: string, refreshTokenExpiresAt: Date): Promise<IssuedSession> {
    const { accessToken, expiresIn } = await this.accessTokens.issue(userId);
    return { userId, accessToken, expiresIn, refreshToken: rawRefreshToken, refreshTokenExpiresAt };
  }

  private newToken(userId: string, familyId: string): { raw: string; record: NewRefreshToken } {
    const raw = generateOpaqueToken();
    const expiresAt = new Date(this.clock.now().getTime() + this.settings.refreshTokenTtlDays * 86_400_000);
    return { raw, record: { userId, familyId, tokenHash: hashToken(raw), expiresAt } };
  }
}
