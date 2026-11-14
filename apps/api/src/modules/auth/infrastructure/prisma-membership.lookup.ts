import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { HouseholdContext } from '../../../common/auth/auth-context';

/** Resolves the caller's household from HouseholdMember (X-001). One indexed lookup per request. */
@Injectable()
export class PrismaMembershipLookup {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<HouseholdContext | null> {
    const m = await this.prisma.householdMember.findUnique({
      where: { userId },
      select: { householdId: true, partnerSlot: true, role: true },
    });
    return m ? { userId, householdId: m.householdId, partnerSlot: m.partnerSlot, role: m.role } : null;
  }
}
