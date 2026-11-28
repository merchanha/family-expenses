import { Injectable } from '@nestjs/common';
import type { UpsertBudgetInput } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import type { BudgetRecord } from '../domain/budget';
import { BudgetCategoryInactiveError, BudgetCategoryNotExpenseError, BudgetCategoryNotFoundError } from '../domain/budget.errors';
import { BudgetRepository } from '../domain/budget.repository';

/**
 * PUT /budgets — one budget per expense category per month (decision #18). Creates or updates the
 * amount/split; never touches transactions. Inactive categories keep an existing budget editable
 * but cannot get a new one.
 */
@Injectable()
export class UpsertBudgetUseCase {
  constructor(private readonly budgets: BudgetRepository) {}

  async execute(ctx: HouseholdContext, input: UpsertBudgetInput): Promise<BudgetRecord> {
    const category = await this.budgets.findCategory(ctx.householdId, input.categoryId);
    if (!category) throw new BudgetCategoryNotFoundError();
    if (category.type !== 'EXPENSE') throw new BudgetCategoryNotExpenseError();
    const period = { year: input.year, month: input.month };
    const existing = await this.budgets.findByCategoryMonth(ctx.householdId, category.id, period);
    if (existing) {
      return this.budgets.update(ctx.householdId, existing.id, {
        amount: input.amount,
        ...(input.splitPartner1Percent !== undefined ? { splitPartner1Percent: input.splitPartner1Percent } : {}),
      });
    }
    if (!category.isActive) throw new BudgetCategoryInactiveError();
    return this.budgets.create({
      householdId: ctx.householdId,
      categoryId: category.id,
      ...period,
      amount: input.amount,
      currency: await this.budgets.householdCurrency(ctx.householdId),
      splitPartner1Percent: input.splitPartner1Percent ?? null,
    });
  }
}
