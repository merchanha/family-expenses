import { Injectable } from '@nestjs/common';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { BudgetNotFoundError } from '../domain/budget.errors';
import { BudgetRepository } from '../domain/budget.repository';

/** DELETE /budgets/:id — removed for good; no transaction references a budget. */
@Injectable()
export class DeleteBudgetUseCase {
  constructor(private readonly budgets: BudgetRepository) {}

  async execute(ctx: HouseholdContext, budgetId: string): Promise<void> {
    if (!(await this.budgets.delete(ctx.householdId, budgetId))) throw new BudgetNotFoundError();
  }
}
