import { Module } from '@nestjs/common';
import { GetFinancialProgressQuery } from './application/get-financial-progress.query';
import { FinancialProgressController } from './presentation/financial-progress.controller';

@Module({
  controllers: [FinancialProgressController],
  providers: [GetFinancialProgressQuery],
})
export class FinancialProgressModule {}
