import { Injectable } from '@nestjs/common';
import type { InvitePreviewResponse } from '@tandem/shared';
import { Clock } from '../../../common/clock';
import { hashToken } from '../../../common/secure-token';
import { PrismaService } from '../../../prisma/prisma.service';
import { InviteNotFoundError } from '../domain/household.errors';

/** Public lookup by raw token for the "join household" screen. Reports PENDING-but-expired as EXPIRED. */
@Injectable()
export class PreviewInviteQuery {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async execute(token: string): Promise<InvitePreviewResponse> {
    const invite = await this.prisma.householdInvite.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { household: { select: { name: true } } },
    });
    if (!invite) throw new InviteNotFoundError();
    const inviter = await this.prisma.user.findUnique({ where: { id: invite.invitedById }, select: { name: true } });
    const expired = invite.status === 'PENDING' && invite.expiresAt.getTime() <= this.clock.now().getTime();
    return {
      householdName: invite.household.name,
      invitedByName: inviter?.name ?? '',
      email: invite.email,
      status: expired ? 'EXPIRED' : invite.status,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }
}
