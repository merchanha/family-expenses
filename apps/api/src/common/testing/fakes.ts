import { Clock } from '../clock';
import { HouseholdInviteMail, MailService, PasswordResetMail } from '../mail/mail.service';

/** Test-only clock you can move forward. */
export class FixedClock extends Clock {
  constructor(private current = new Date('2026-11-14T12:00:00.000Z')) {
    super();
  }
  now(): Date {
    return new Date(this.current);
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

/** Test-only mailer that records what would have been sent. */
export class RecordingMailService extends MailService {
  readonly resets: PasswordResetMail[] = [];
  readonly invites: HouseholdInviteMail[] = [];
  async sendPasswordReset(mail: PasswordResetMail): Promise<void> {
    this.resets.push(mail);
  }
  async sendHouseholdInvite(mail: HouseholdInviteMail): Promise<void> {
    this.invites.push(mail);
  }
}

/** Extract `token` from a link like https://web/reset-password?token=abc */
export const tokenFromLink = (link: string): string => {
  const token = new URL(link).searchParams.get('token');
  if (!token) throw new Error(`No token in ${link}`);
  return token;
};
