import { Injectable } from '@nestjs/common';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { TransactionNotFoundError } from '../domain/transaction.errors';
import { TransactionRepository } from '../domain/transaction.repository';

/** Hard delete; summaries are computed from stored rows, so they update automatically (BR §2.9). */
@Injectable()
export class DeleteTransactionUseCase {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(ctx: HouseholdContext, transactionId: string): Promise<void> {
    if (!(await this.transactions.delete(ctx.householdId, transactionId))) throw new TransactionNotFoundError();
  }
}
