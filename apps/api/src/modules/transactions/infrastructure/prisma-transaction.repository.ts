import { Injectable } from '@nestjs/common';
import { toDecimal } from '../../../common/money';
import { dateOnlyToDate } from '../../../common/period';
import { PrismaService } from '../../../prisma/prisma.service';
import type { CategoryRef, NewTransaction, TransactionPatch, TransactionState } from '../domain/transaction';
import { TransactionRepository } from '../domain/transaction.repository';

@Injectable()
export class PrismaTransactionRepository extends TransactionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findById(householdId: string, transactionId: string): Promise<TransactionState | null> {
    return this.prisma.transaction.findFirst({
      where: { id: transactionId, householdId },
      select: { id: true, type: true, categoryId: true },
    });
  }

  findCategory(householdId: string, categoryId: string): Promise<CategoryRef | null> {
    return this.prisma.category.findFirst({
      where: { id: categoryId, householdId },
      select: { id: true, type: true, isActive: true },
    });
  }

  async isMember(householdId: string, userId: string): Promise<boolean> {
    const m = await this.prisma.householdMember.findUnique({
      where: { householdId_userId: { householdId, userId } },
      select: { id: true },
    });
    return m !== null;
  }

  async householdCurrency(householdId: string): Promise<string> {
    const h = await this.prisma.household.findUniqueOrThrow({ where: { id: householdId }, select: { defaultCurrency: true } });
    return h.defaultCurrency;
  }

  async create(t: NewTransaction): Promise<string> {
    const row = await this.prisma.transaction.create({
      data: { ...t, amount: toDecimal(t.amount), transactionDate: dateOnlyToDate(t.transactionDate) },
      select: { id: true },
    });
    return row.id;
  }

  async update(householdId: string, transactionId: string, patch: TransactionPatch): Promise<void> {
    const { amount, transactionDate, ...rest } = patch;
    await this.prisma.transaction.updateMany({
      where: { id: transactionId, householdId },
      data: {
        ...rest,
        ...(amount !== undefined ? { amount: toDecimal(amount) } : {}),
        ...(transactionDate !== undefined ? { transactionDate: dateOnlyToDate(transactionDate) } : {}),
      },
    });
  }

  async delete(householdId: string, transactionId: string): Promise<boolean> {
    const { count } = await this.prisma.transaction.deleteMany({ where: { id: transactionId, householdId } });
    return count > 0;
  }
}
