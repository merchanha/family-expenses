import { Injectable } from '@nestjs/common';
import { Clock } from '../../../common/clock';
import { hashToken } from '../../../common/secure-token';
import { RefreshTokenRepository } from '../domain/refresh-token.repository';

/** Revokes the presented session's whole token family. Idempotent; never fails for bad tokens. */
@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly clock: Clock,
  ) {}

  async execute(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const current = await this.refreshTokens.findByHash(hashToken(rawToken));
    if (current) await this.refreshTokens.revokeFamily(current.familyId, this.clock.now());
  }
}
