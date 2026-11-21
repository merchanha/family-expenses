import { Injectable } from '@nestjs/common';
import type { UpdateTransactionInput } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { assertCategoryAssignable } from '../domain/transaction-rules';
import { PaidByNotMemberError, TransactionNotFoundError } from '../domain/transaction.errors';
import { TransactionRepository } from '../domain/transaction.repository';

/** Partial edit; the category/type rule is checked on the resulting values. createdBy never changes. */
@Injectable()
export class UpdateTransactionUseCase {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(ctx: HouseholdContext, transactionId: string, input: UpdateTransactionInput): Promise<void> {
    const current = await this.transactions.findById(ctx.householdId, transactionId);
    if (!current) throw new TransactionNotFoundError();

    const type = input.type ?? current.type;
    const categoryId = input.categoryId ?? current.categoryId;
    if (input.type !== undefined || input.categoryId !== undefined) {
      const category = await this.transactions.findCategory(ctx.householdId, categoryId);
      assertCategoryAssignable(category, type, { newlyAssigned: categoryId !== current.categoryId });
    }
    if (input.paidById && !(await this.transactions.isMember(ctx.householdId, input.paidById))) {
      throw new PaidByNotMemberError();
    }
    await this.transactions.update(ctx.householdId, transactionId, input);
  }
}
