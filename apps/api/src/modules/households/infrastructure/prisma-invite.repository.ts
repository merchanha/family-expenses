import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { InviteRecord, NewMember } from '../domain/household';
import { InviteRepository, NewInvite } from '../domain/invite.repository';

@Injectable()
export class PrismaInviteRepository extends InviteRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  replacePending(invite: NewInvite): Promise<InviteRecord> {
    return this.prisma.$transaction(async (tx) => {
      await tx.householdInvite.updateMany({
        where: { householdId: invite.householdId, status: 'PENDING' },
        data: { status: 'REVOKED' },
      });
      return tx.householdInvite.create({ data: invite });
    });
  }

  findByTokenHash(tokenHash: string): Promise<InviteRecord | null> {
    return this.prisma.householdInvite.findUnique({ where: { tokenHash } });
  }

  findById(householdId: string, inviteId: string): Promise<InviteRecord | null> {
    return this.prisma.householdInvite.findFirst({ where: { id: inviteId, householdId } });
  }

  async revoke(householdId: string, inviteId: string): Promise<void> {
    await this.prisma.householdInvite.updateMany({
      where: { id: inviteId, householdId, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });
  }

  accept(inviteId: string, householdId: string, member: NewMember, at: Date): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.householdInvite.updateMany({
        where: { id: inviteId, householdId, status: 'PENDING', expiresAt: { gt: at } },
        data: { status: 'ACCEPTED' },
      });
      if (count === 0) return false;
      await tx.householdMember.create({ data: { ...member, householdId } });
      return true;
    });
  }
}
