import { Injectable } from '@nestjs/common';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { InviteNotFoundError, InviteNotUsableError, OwnerOnlyError } from '../domain/household.errors';
import { InviteRepository } from '../domain/invite.repository';

@Injectable()
export class RevokeInviteUseCase {
  constructor(private readonly invites: InviteRepository) {}

  async execute(ctx: HouseholdContext, inviteId: string): Promise<void> {
    const invite = await this.invites.findById(ctx.householdId, inviteId);
    if (!invite) throw new InviteNotFoundError();
    if (ctx.role !== 'OWNER') throw new OwnerOnlyError();
    if (invite.status !== 'PENDING') throw new InviteNotUsableError();
    await this.invites.revoke(ctx.householdId, inviteId);
  }
}
