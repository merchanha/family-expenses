import { Injectable } from '@nestjs/common';
import type { ResetPasswordInput } from '@tandem/shared';
import { Clock } from '../../../common/clock';
import { hashToken } from '../../../common/secure-token';
import { InvalidResetTokenError } from '../domain/auth.errors';
import { PasswordHasher } from '../domain/password-hasher';
import { PasswordResetTokenRepository } from '../domain/password-reset-token.repository';

/** Single-use, short-lived token. On success every existing session of the user is revoked. */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly resetTokens: PasswordResetTokenRepository,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    const now = this.clock.now();
    const token = await this.resetTokens.findByHash(hashToken(input.token));
    if (!token || token.usedAt || token.expiresAt.getTime() <= now.getTime()) throw new InvalidResetTokenError();
    const passwordHash = await this.hasher.hash(input.password);
    const consumed = await this.resetTokens.consumeAndSetPassword(token.id, token.userId, passwordHash, now);
    if (!consumed) throw new InvalidResetTokenError();
  }
}
