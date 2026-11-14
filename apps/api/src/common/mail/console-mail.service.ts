import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import { HouseholdInviteMail, MailService, PasswordResetMail } from './mail.service';

/**
 * Console transport. Outside production it logs the link so devs/QA can follow flows.
 * In production it never logs links, tokens or addresses (a real provider replaces it pre-launch).
 */
@Injectable()
export class ConsoleMailService extends MailService {
  private readonly logger = new Logger(ConsoleMailService.name);
  private readonly isProduction: boolean;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  async sendPasswordReset(mail: PasswordResetMail): Promise<void> {
    if (this.isProduction) return this.logger.warn('Password reset email not sent: no mail provider configured');
    this.logger.log(`[dev mail] Password reset for ${mail.to}: ${mail.link}`);
  }

  async sendHouseholdInvite(mail: HouseholdInviteMail): Promise<void> {
    if (this.isProduction) return this.logger.warn('Invite email not sent: no mail provider configured');
    this.logger.log(`[dev mail] ${mail.inviterName} invited ${mail.to} to "${mail.householdName}": ${mail.link}`);
  }
}
