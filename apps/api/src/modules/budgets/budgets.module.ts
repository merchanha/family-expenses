import { Module } from '@nestjs/common';
import { CopyPreviousMonthBudgetsUseCase } from './application/copy-previous-month-budgets.use-case';
import { DeleteBudgetUseCase } from './application/delete-budget.use-case';
import { GetBudgetUtilizationQuery } from './application/get-budget-utilization.query';
import { UpsertBudgetUseCase } from './application/upsert-budget.use-case';
import { BudgetRepository } from './domain/budget.repository';
import { PrismaBudgetRepository } from './infrastructure/prisma-budget.repository';
import { BudgetsController } from './presentation/budgets.controller';

@Module({
  controllers: [BudgetsController],
  providers: [
    { provide: BudgetRepository, useClass: PrismaBudgetRepository },
    UpsertBudgetUseCase,
    DeleteBudgetUseCase,
    CopyPreviousMonthBudgetsUseCase,
    GetBudgetUtilizationQuery,
  ],
})
export class BudgetsModule {}
