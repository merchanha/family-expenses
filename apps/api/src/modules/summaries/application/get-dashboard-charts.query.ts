import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import type { DashboardChartsQuery, DashboardChartsResponse } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { Clock } from '../../../common/clock';
import { paidByPartnerWhere } from '../../../common/partner-filter';
import { dateOnlyToDate, dateToDateOnly, periodOrCurrentMonth, todayInTimeZone } from '../../../common/period';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildCashFlowTrajectory, spendingShares, trajectoryDays, type DailyTotals } from '../domain/dashboard-charts';

const categorySelect = { id: true, name: true, icon: true, color: true, type: true, isActive: true } as const;
const dec = (v: { toString(): string } | null) => new Decimal(v ? v.toString() : 0);

/**
 * GET /summaries/charts — cash-flow trajectory + spending by category for one month (decision #17).
 * Grouping is SQL; running totals and shares are in domain/dashboard-charts. The budget card uses
 * GET /budgets/utilization (summary) instead of duplicating it here.
 */
@Injectable()
export class GetDashboardChartsQuery {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async execute(ctx: HouseholdContext, input: DashboardChartsQuery): Promise<DashboardChartsResponse> {
    const household = await this.prisma.household.findUniqueOrThrow({
      where: { id: ctx.householdId },
      select: { timezone: true, defaultCurrency: true },
    });
    const now = this.clock.now();
    const period = periodOrCurrentMonth({ year: input.year, month: input.month }, now, household.timezone);
    const where = {
      householdId: ctx.householdId,
      transactionDate: { gte: dateOnlyToDate(period.from), lte: dateOnlyToDate(period.to) },
      ...paidByPartnerWhere(ctx.householdId, input.partner),
    };
    // Both groupings cover the whole month. The trajectory then stops at today, so in the current
    // month future-dated rows show in spendingByCategory/totalExpenses (like /summaries/period) but
    // not in the trajectory: its last point equals the period summary only without future-dated rows.
    const [daily, byCategory] = await Promise.all([
      this.prisma.transaction.groupBy({ by: ['transactionDate', 'type'], where, _sum: { amount: true } }),
      this.prisma.transaction.groupBy({ by: ['categoryId'], where: { ...where, type: 'EXPENSE' }, _sum: { amount: true } }),
    ]);

    const byDay = new Map<string, DailyTotals>();
    for (const g of daily) {
      const date = dateToDateOnly(g.transactionDate);
      const day = byDay.get(date) ?? { income: new Decimal(0), expenses: new Decimal(0) };
      if (g.type === 'INCOME') day.income = day.income.plus(dec(g._sum.amount));
      else day.expenses = day.expenses.plus(dec(g._sum.amount));
      byDay.set(date, day);
    }
    const trajectory = buildCashFlowTrajectory(trajectoryDays(period, todayInTimeZone(now, household.timezone)), byDay);

    const categories = await this.prisma.category.findMany({
      where: { householdId: ctx.householdId, id: { in: byCategory.map((g) => g.categoryId) } },
      select: categorySelect,
    });
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const shares = spendingShares(
      byCategory.flatMap((g) => {
        const category = categoryById.get(g.categoryId);
        return category ? [{ category, amount: dec(g._sum.amount) }] : [];
      }),
    );

    return {
      period,
      partner: input.partner ?? null,
      currency: household.defaultCurrency,
      cashFlowTrajectory: trajectory.map((p) => ({
        date: p.date,
        cumulativeIncome: p.cumulativeIncome.toFixed(2),
        cumulativeExpenses: p.cumulativeExpenses.toFixed(2),
      })),
      spendingByCategory: shares.items.map((s) => ({
        category: s.category,
        amount: s.amount.toFixed(2),
        sharePercent: s.sharePercent.toFixed(2),
      })),
      totalExpenses: shares.total.toFixed(2),
    };
  }
}
