import { Injectable } from '@nestjs/common';
import type { CurrentHouseholdResponse } from '@tandem/shared';
import { Clock } from '../../../common/clock';
import { PrismaService } from '../../../prisma/prisma.service';
import { HouseholdNotFoundError } from '../domain/household.errors';
import { toHouseholdResponse, toInviteResponse, toMemberResponse } from '../infrastructure/household.mapper';

/** Read side for GET /households/me (and the response of every household write). */
@Injectable()
export class GetCurrentHouseholdQuery {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async execute(householdId: string, userId: string): Promise<CurrentHouseholdResponse> {
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      include: {
        members: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { partnerSlot: 'asc' },
        },
        invites: {
          where: { status: 'PENDING', expiresAt: { gt: this.clock.now() } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    const me = household?.members.find((m) => m.userId === userId);
    if (!household || !me) throw new HouseholdNotFoundError();
    return {
      household: toHouseholdResponse(household),
      members: household.members.map(toMemberResponse),
      invites: household.invites.map(toInviteResponse),
      me: { userId, partnerSlot: me.partnerSlot, role: me.role },
    };
  }
}
