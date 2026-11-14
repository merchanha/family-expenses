import { Injectable } from '@nestjs/common';
import type { ForgotPasswordInput } from '@tandem/shared';
import { Clock } from '../../../common/clock';
import { MailService } from '../../../common/mail/mail.service';
import { generateOpaqueToken, hashToken } from '../../../common/secure-token';
import { AuthSettings } from '../domain/auth-settings';
import { PasswordResetTokenRepository } from '../domain/password-reset-token.repository';
import { UserRepository } from '../domain/user.repository';

/** Always resolves the same way whether or not the email exists (no account enumeration). */
@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly resetTokens: PasswordResetTokenRepository,
    private readonly mail: MailService,
    private readonly settings: AuthSettings,
    private readonly clock: Clock,
  ) {}

  async execute(input: ForgotPasswordInput): Promise<void> {
    const user = await this.users.findByEmail(input.email);
    if (!user) return;
    const now = this.clock.now();
    const raw = generateOpaqueToken();
    const expiresAt = new Date(now.getTime() + this.settings.passwordResetTtlMinutes * 60_000);
    await this.resetTokens.replaceForUser({ userId: user.id, tokenHash: hashToken(raw), expiresAt }, now);
    const link = `${this.settings.webAppUrl}/reset-password?token=${encodeURIComponent(raw)}`;
    await this.mail.sendPasswordReset({ to: user.email, name: user.name, link });
  }
}
