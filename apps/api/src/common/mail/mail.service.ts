/** Outbound email port (Decision #2). Dev uses ConsoleMailService; Resend/SES before production. */
export interface PasswordResetMail {
  to: string;
  name: string;
  link: string;
}

export interface HouseholdInviteMail {
  to: string;
  inviterName: string;
  householdName: string;
  link: string;
}

export abstract class MailService {
  abstract sendPasswordReset(mail: PasswordResetMail): Promise<void>;
  abstract sendHouseholdInvite(mail: HouseholdInviteMail): Promise<void>;
}
