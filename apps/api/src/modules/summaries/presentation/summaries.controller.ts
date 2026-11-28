import { Controller, Get, Query } from '@nestjs/common';
import {
  dashboardChartsQuerySchema,
  periodSummaryQuerySchema,
  type DashboardChartsQuery,
  type DashboardChartsResponse,
  type PeriodSummaryQuery,
  type PeriodSummaryResponse,
} from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { CurrentHousehold } from '../../../common/auth/auth.decorators';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { GetDashboardChartsQuery } from '../application/get-dashboard-charts.query';
import { GetPeriodSummaryQuery } from '../application/get-period-summary.query';

@Controller('summaries')
export class SummariesController {
  constructor(
    private readonly periodSummary: GetPeriodSummaryQuery,
    private readonly dashboardCharts: GetDashboardChartsQuery,
  ) {}

  @Get('period')
  period(
    @CurrentHousehold() ctx: HouseholdContext,
    @Query(new ZodValidationPipe(periodSummaryQuerySchema)) query: PeriodSummaryQuery,
  ): Promise<PeriodSummaryResponse> {
    return this.periodSummary.execute(ctx, query);
  }

  @Get('charts')
  charts(
    @CurrentHousehold() ctx: HouseholdContext,
    @Query(new ZodValidationPipe(dashboardChartsQuerySchema)) query: DashboardChartsQuery,
  ): Promise<DashboardChartsResponse> {
    return this.dashboardCharts.execute(ctx, query);
  }
}
