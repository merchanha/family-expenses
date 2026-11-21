import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { seedDefaultCategories } from '../../categories/infrastructure/default-categories';
import type { HouseholdRecord, UserIdentity } from '../domain/household';
import { HouseholdPatch, HouseholdRepository, MemberPatch, NewHousehold } from '../domain/household.repository';

@Injectable()
export class PrismaHouseholdRepository extends HouseholdRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  createWithOwner(input: NewHousehold): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: {
          name: input.name,
          defaultCurrency: input.defaultCurrency,
          timezone: input.timezone,
          members: { create: input.owner },
        },
        select: { id: true },
      });
      await seedDefaultCategories(tx, household.id);
      return household.id;
    });
  }

  findById(householdId: string): Promise<HouseholdRecord | null> {
    return this.prisma.household.findUnique({ where: { id: householdId } });
  }

  async update(householdId: string, patch: HouseholdPatch): Promise<void> {
    await this.prisma.household.update({ where: { id: householdId }, data: patch });
  }

  async updateMember(householdId: string, userId: string, patch: MemberPatch): Promise<void> {
    await this.prisma.householdMember.update({ where: { householdId_userId: { householdId, userId } }, data: patch });
  }

  countMembers(householdId: string): Promise<number> {
    return this.prisma.householdMember.count({ where: { householdId } });
  }

  async findHouseholdIdOfUser(userId: string): Promise<string | null> {
    const m = await this.prisma.householdMember.findUnique({ where: { userId }, select: { householdId: true } });
    return m?.householdId ?? null;
  }

  findUser(userId: string): Promise<UserIdentity | null> {
    return this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
  }
}
