import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import {
  budgetUtilizationQuerySchema,
  copyPreviousMonthBudgetsSchema,
  upsertBudgetSchema,
  z,
  type Budget,
  type BudgetUtilizationQuery,
  type BudgetUtilizationResponse,
  type CopyPreviousMonthBudgetsInput,
  type CopyPreviousMonthBudgetsResponse,
  type UpsertBudgetInput,
} from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { CurrentHousehold } from '../../../common/auth/auth.decorators';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { CopyPreviousMonthBudgetsUseCase } from '../application/copy-previous-month-budgets.use-case';
import { DeleteBudgetUseCase } from '../application/delete-budget.use-case';
import { GetBudgetUtilizationQuery } from '../application/get-budget-utilization.query';
import { UpsertBudgetUseCase } from '../application/upsert-budget.use-case';
import { toBudgetResponse } from '../infrastructure/budget.mapper';

const idParamSchema = z.string().min(1).max(64);

@Controller('budgets')
export class BudgetsController {
  constructor(
    private readonly utilization: GetBudgetUtilizationQuery,
    private readonly upsertBudget: UpsertBudgetUseCase,
    private readonly deleteBudget: DeleteBudgetUseCase,
    private readonly copyPreviousMonth: CopyPreviousMonthBudgetsUseCase,
  ) {}

  @Get('utilization')
  getUtilization(
    @CurrentHousehold() ctx: HouseholdContext,
    @Query(new ZodValidationPipe(budgetUtilizationQuerySchema)) query: BudgetUtilizationQuery,
  ): Promise<BudgetUtilizationResponse> {
    return this.utilization.execute(ctx, query);
  }

  @Put()
  async upsert(
    @CurrentHousehold() ctx: HouseholdContext,
    @Body(new ZodValidationPipe(upsertBudgetSchema)) body: UpsertBudgetInput,
  ): Promise<Budget> {
    return toBudgetResponse(await this.upsertBudget.execute(ctx, body));
  }

  @Post('copy-previous-month')
  @HttpCode(HttpStatus.OK)
  async copy(
    @CurrentHousehold() ctx: HouseholdContext,
    @Body(new ZodValidationPipe(copyPreviousMonthBudgetsSchema)) body: CopyPreviousMonthBudgetsInput,
  ): Promise<CopyPreviousMonthBudgetsResponse> {
    return { created: await this.copyPreviousMonth.execute(ctx, body) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentHousehold() ctx: HouseholdContext,
    @Param('id', new ZodValidationPipe(idParamSchema)) id: string,
  ): Promise<void> {
    await this.deleteBudget.execute(ctx, id);
  }
}
