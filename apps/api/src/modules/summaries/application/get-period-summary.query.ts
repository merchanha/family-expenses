import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import type { PeriodSummaryQuery, PeriodSummaryResponse } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { Clock } from '../../../common/clock';
import { paidByPartnerWhere } from '../../../common/partner-filter';
import { dateOnlyToDate, periodOrCurrentMonth } from '../../../common/period';
import { PrismaService } from '../../../prisma/prisma.service';
import { calculatePeriodTotals } from '../domain/period-totals';

/**
 * GET /summaries/period — sums by type in SQL over transactionDate (never createdAt); the formulas
 * live in domain/period-totals. Default period = current month in the household timezone.
 * Savings contributions (P5) are not part of these figures.
 */
@Injectable()
export class GetPeriodSummaryQuery {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async execute(ctx: HouseholdContext, input: PeriodSummaryQuery): Promise<PeriodSummaryResponse> {
    const household = await this.prisma.household.findUniqueOrThrow({
      where: { id: ctx.householdId },
      select: { timezone: true, defaultCurrency: true },
    });
    const period = periodOrCurrentMonth(input, this.clock.now(), household.timezone);
    const groups = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: {
        householdId: ctx.householdId,
        transactionDate: { gte: dateOnlyToDate(period.from), lte: dateOnlyToDate(period.to) },
        ...paidByPartnerWhere(ctx.householdId, input.partner),
      },
      _sum: { amount: true },
      _count: { _all: true },
    });
    const sumOf = (type: 'INCOME' | 'EXPENSE') => {
      const sum = groups.find((g) => g.type === type)?._sum.amount;
      return new Decimal(sum ? sum.toString() : 0);
    };
    const totals = calculatePeriodTotals(sumOf('INCOME'), sumOf('EXPENSE'));
    return {
      period,
      partner: input.partner ?? null,
      currency: household.defaultCurrency,
      income: totals.income.toFixed(2),
      expenses: totals.expenses.toFixed(2),
      netCashFlowBuffer: totals.netCashFlowBuffer.toFixed(2),
      savingsRate: totals.savingsRate ? totals.savingsRate.toFixed(2) : null,
      transactionCount: groups.reduce((n, g) => n + g._count._all, 0),
    };
  }
}
