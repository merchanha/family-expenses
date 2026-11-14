import { Injectable } from '@nestjs/common';
import type { CurrentUserResponse } from '@tandem/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserNotFoundError } from '../domain/auth.errors';

/** Read side for GET /auth/me and the session responses. Never exposes passwordHash. */
@Injectable()
export class GetCurrentUserQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<CurrentUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        memberships: {
          select: { partnerSlot: true, role: true, household: { select: { id: true, name: true } } },
          take: 1,
        },
      },
    });
    if (!user) throw new UserNotFoundError();
    const m = user.memberships[0];
    return {
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt.toISOString() },
      household: m ? { id: m.household.id, name: m.household.name, partnerSlot: m.partnerSlot, role: m.role } : null,
    };
  }
}
