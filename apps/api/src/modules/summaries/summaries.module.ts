import { Module } from '@nestjs/common';
import { GetPeriodSummaryQuery } from './application/get-period-summary.query';
import { SummariesController } from './presentation/summaries.controller';

@Module({
  controllers: [SummariesController],
  providers: [GetPeriodSummaryQuery],
})
export class SummariesModule {}
