import { Injectable } from '@nestjs/common';
import type { CreateInviteInput } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { Clock } from '../../../common/clock';
import { MailService } from '../../../common/mail/mail.service';
import { generateOpaqueToken, hashToken } from '../../../common/secure-token';
import type { InviteRecord } from '../domain/household';
import { assertCanInvite } from '../domain/household-rules';
import { HouseholdNotFoundError } from '../domain/household.errors';
import { HouseholdRepository } from '../domain/household.repository';
import { HouseholdSettings } from '../domain/household-settings';
import { InviteRepository } from '../domain/invite.repository';

export interface CreatedInvite {
  invite: InviteRecord;
  inviteUrl: string;
}

/** OWNER invites the partner. A new invite replaces any pending one. Email is sent after the write. */
@Injectable()
export class CreateInviteUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly invites: InviteRepository,
    private readonly mail: MailService,
    private readonly settings: HouseholdSettings,
    private readonly clock: Clock,
  ) {}

  async execute(ctx: HouseholdContext, input: CreateInviteInput): Promise<CreatedInvite> {
    const [household, inviter, memberCount] = await Promise.all([
      this.households.findById(ctx.householdId),
      this.households.findUser(ctx.userId),
      this.households.countMembers(ctx.householdId),
    ]);
    if (!household || !inviter) throw new HouseholdNotFoundError();
    assertCanInvite({ role: ctx.role, memberCount, inviterEmail: inviter.email, inviteeEmail: input.email });

    const raw = generateOpaqueToken();
    const expiresAt = new Date(this.clock.now().getTime() + this.settings.inviteTtlDays * 86_400_000);
    const invite = await this.invites.replacePending({
      householdId: ctx.householdId,
      email: input.email,
      tokenHash: hashToken(raw),
      invitedById: ctx.userId,
      expiresAt,
    });
    const inviteUrl = `${this.settings.webAppUrl}/join?token=${encodeURIComponent(raw)}`;
    await this.mail.sendHouseholdInvite({
      to: input.email,
      inviterName: inviter.name,
      householdName: household.name,
      link: inviteUrl,
    });
    return { invite, inviteUrl };
  }
}
