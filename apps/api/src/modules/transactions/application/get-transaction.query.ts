import { Injectable } from '@nestjs/common';
import type { Transaction } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { PrismaService } from '../../../prisma/prisma.service';
import { TransactionNotFoundError } from '../domain/transaction.errors';
import { toTransactionResponse, transactionInclude } from '../infrastructure/transaction.mapper';

/** Read side for GET /transactions/:id and the response of every transaction write. */
@Injectable()
export class GetTransactionQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(ctx: HouseholdContext, transactionId: string): Promise<Transaction> {
    const row = await this.prisma.transaction.findFirst({
      where: { id: transactionId, householdId: ctx.householdId },
      include: transactionInclude(ctx.householdId),
    });
    if (!row) throw new TransactionNotFoundError();
    return toTransactionResponse(row);
  }
}
