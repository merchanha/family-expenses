import { Injectable } from '@nestjs/common';
import type { CreateTransactionInput } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { assertCategoryAssignable } from '../domain/transaction-rules';
import { PaidByNotMemberError } from '../domain/transaction.errors';
import { TransactionRepository } from '../domain/transaction.repository';

/** createdBy = the caller; currency = household default (no conversion in the MVP). Returns the id. */
@Injectable()
export class CreateTransactionUseCase {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(ctx: HouseholdContext, input: CreateTransactionInput): Promise<string> {
    const category = await this.transactions.findCategory(ctx.householdId, input.categoryId);
    assertCategoryAssignable(category, input.type, { newlyAssigned: true });
    const paidById = input.paidById ?? null;
    if (paidById && !(await this.transactions.isMember(ctx.householdId, paidById))) throw new PaidByNotMemberError();
    return this.transactions.create({
      householdId: ctx.householdId,
      createdById: ctx.userId,
      type: input.type,
      description: input.description,
      amount: input.amount,
      currency: await this.transactions.householdCurrency(ctx.householdId),
      categoryId: input.categoryId,
      transactionDate: input.transactionDate,
      paidById,
      paymentMethod: input.paymentMethod ?? null,
      notes: input.notes ?? null,
    });
  }
}
