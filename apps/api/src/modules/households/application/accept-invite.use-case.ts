import { Injectable } from '@nestjs/common';
import { PARTNER_COLORS, type AcceptInviteInput } from '@tandem/shared';
import type { AuthUserContext } from '../../../common/auth/auth-context';
import { Clock } from '../../../common/clock';
import { hashToken } from '../../../common/secure-token';
import { assertCanAcceptInvite } from '../domain/household-rules';
import {
  AlreadyInHouseholdError,
  HouseholdNotFoundError,
  InviteNotFoundError,
  InviteNotUsableError,
} from '../domain/household.errors';
import { HouseholdRepository } from '../domain/household.repository';
import { InviteRepository } from '../domain/invite.repository';

/** The invited partner joins as MEMBER / PARTNER_2 of the inviting household — and only that one. */
@Injectable()
export class AcceptInviteUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly invites: InviteRepository,
    private readonly clock: Clock,
  ) {}

  async execute(ctx: AuthUserContext, input: AcceptInviteInput): Promise<string> {
    const invite = await this.invites.findByTokenHash(hashToken(input.token));
    if (!invite) throw new InviteNotFoundError();
    if (await this.households.findHouseholdIdOfUser(ctx.userId)) throw new AlreadyInHouseholdError();

    const [user, memberCount] = await Promise.all([
      this.households.findUser(ctx.userId),
      this.households.countMembers(invite.householdId),
    ]);
    if (!user) throw new HouseholdNotFoundError();
    const now = this.clock.now();
    assertCanAcceptInvite({ invite, userEmail: user.email, memberCount, now });

    const accepted = await this.invites.accept(
      invite.id,
      invite.householdId,
      { userId: ctx.userId, role: 'MEMBER', partnerSlot: 'PARTNER_2', displayName: null, displayColor: PARTNER_COLORS.PARTNER_2 },
      now,
    );
    if (!accepted) throw new InviteNotUsableError();
    return invite.householdId;
  }
}
