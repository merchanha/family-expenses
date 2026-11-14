import { Injectable, Logger } from '@nestjs/common';
import { Clock } from '../../../common/clock';
import { hashToken } from '../../../common/secure-token';
import { InvalidRefreshTokenError } from '../domain/auth.errors';
import { RefreshTokenRepository } from '../domain/refresh-token.repository';
import { IssuedSession, SessionIssuer } from './session-issuer';

/**
 * Rotate a refresh token (Decision #5). Presenting a token that was already rotated or revoked is
 * treated as theft: the whole family is revoked and the caller must sign in again.
 */
@Injectable()
export class RefreshSessionUseCase {
  private readonly logger = new Logger(RefreshSessionUseCase.name);

  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly sessions: SessionIssuer,
    private readonly clock: Clock,
  ) {}

  async execute(rawToken: string | undefined): Promise<IssuedSession> {
    if (!rawToken) throw new InvalidRefreshTokenError();
    const now = this.clock.now();
    const current = await this.refreshTokens.findByHash(hashToken(rawToken));
    if (!current) throw new InvalidRefreshTokenError();

    if (current.revokedAt) {
      await this.revokeFamilyOnReuse(current.familyId, current.userId, now);
      throw new InvalidRefreshTokenError();
    }
    if (current.expiresAt.getTime() <= now.getTime()) throw new InvalidRefreshTokenError();

    const next = this.sessions.nextInFamily(current.userId, current.familyId);
    const rotated = await this.refreshTokens.rotate(current.id, next.record, now);
    if (!rotated) {
      // Lost a race with another use of the same token → also reuse.
      await this.revokeFamilyOnReuse(current.familyId, current.userId, now);
      throw new InvalidRefreshTokenError();
    }
    return this.sessions.finish(current.userId, next.raw, rotated.expiresAt);
  }

  private async revokeFamilyOnReuse(familyId: string, userId: string, now: Date): Promise<void> {
    this.logger.warn(`Refresh token reuse detected; revoking session family (userId=${userId})`);
    await this.refreshTokens.revokeFamily(familyId, now);
  }
}
