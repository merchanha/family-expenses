import { Controller, Get, Query } from '@nestjs/common';
import { financialProgressQuerySchema, type FinancialProgressQuery, type FinancialProgressResponse } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { CurrentHousehold } from '../../../common/auth/auth.decorators';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { GetFinancialProgressQuery } from '../application/get-financial-progress.query';

@Controller('financial-progress')
export class FinancialProgressController {
  constructor(private readonly progress: GetFinancialProgressQuery) {}

  @Get('comparison')
  comparison(
    @CurrentHousehold() ctx: HouseholdContext,
    @Query(new ZodValidationPipe(financialProgressQuerySchema)) query: FinancialProgressQuery,
  ): Promise<FinancialProgressResponse> {
    return this.progress.execute(ctx, query);
  }
}
