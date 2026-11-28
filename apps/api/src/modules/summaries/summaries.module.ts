import { Module } from '@nestjs/common';
import { GetDashboardChartsQuery } from './application/get-dashboard-charts.query';
import { GetPeriodSummaryQuery } from './application/get-period-summary.query';
import { SummariesController } from './presentation/summaries.controller';

@Module({
  controllers: [SummariesController],
  providers: [GetPeriodSummaryQuery, GetDashboardChartsQuery],
})
export class SummariesModule {}
