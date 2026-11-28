import { Injectable } from '@nestjs/common';
import type { CopyPreviousMonthBudgetsInput } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { shiftMonth } from '../../../common/period';
import { BudgetRepository } from '../domain/budget.repository';

/**
 * POST /budgets/copy-previous-month — explicit "copy last month" (decision #18; no implicit carryover).
 * Copies M−1 budgets of ACTIVE expense categories that have no budget in M. Never overwrites.
 */
@Injectable()
export class CopyPreviousMonthBudgetsUseCase {
  constructor(private readonly budgets: BudgetRepository) {}

  async execute(ctx: HouseholdContext, input: CopyPreviousMonthBudgetsInput): Promise<number> {
    const target = { year: input.year, month: input.month };
    const [previous, current] = await Promise.all([
      this.budgets.listForMonth(ctx.householdId, shiftMonth(target.year, target.month, -1)),
      this.budgets.listForMonth(ctx.householdId, target),
    ]);
    const alreadyBudgeted = new Set(current.map((b) => b.categoryId));
    const toCreate = previous
      .filter((b) => b.category.isActive && b.category.type === 'EXPENSE' && !alreadyBudgeted.has(b.categoryId))
      .map((b) => ({
        householdId: ctx.householdId,
        categoryId: b.categoryId,
        ...target,
        amount: b.amount,
        currency: b.currency,
        splitPartner1Percent: b.splitPartner1Percent,
      }));
    return toCreate.length === 0 ? 0 : this.budgets.createMany(toCreate);
  }
}
