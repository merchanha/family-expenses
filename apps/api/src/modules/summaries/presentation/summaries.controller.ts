import { Controller, Get, Query } from '@nestjs/common';
import { periodSummaryQuerySchema, type PeriodSummaryQuery, type PeriodSummaryResponse } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { CurrentHousehold } from '../../../common/auth/auth.decorators';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { GetPeriodSummaryQuery } from '../application/get-period-summary.query';

@Controller('summaries')
export class SummariesController {
  constructor(private readonly periodSummary: GetPeriodSummaryQuery) {}

  @Get('period')
  period(
    @CurrentHousehold() ctx: HouseholdContext,
    @Query(new ZodValidationPipe(periodSummaryQuerySchema)) query: PeriodSummaryQuery,
  ): Promise<PeriodSummaryResponse> {
    return this.periodSummary.execute(ctx, query);
  }
}
