import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import type { FinancialProgressQuery, FinancialProgressResponse } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { Clock } from '../../../common/clock';
import { paidByPartnerWhere } from '../../../common/partner-filter';
import { dateOnlyToDate, dateToDateOnly, todayInTimeZone } from '../../../common/period';
import { PrismaService } from '../../../prisma/prisma.service';
import { calculatePeriodTotals } from '../../../common/period-totals';
import {
  compareCategories,
  compareMoney,
  compareRates,
  resolveComparisonPeriods,
  trendMonths,
  type DateRange,
  type MoneyComparison,
} from '../domain/month-comparison';

const categorySelect = { id: true, name: true, icon: true, color: true, type: true, isActive: true } as const;
const dec = (v: { toString(): string } | null) => new Decimal(v ? v.toString() : 0);
const fixed = (d: Decimal | null) => (d === null ? null : d.toFixed(2));
const money = (c: MoneyComparison) => ({
  current: c.current.toFixed(2),
  previous: c.previous.toFixed(2),
  changeAmount: c.changeAmount.toFixed(2),
  changePercent: fixed(c.changePercent),
});

interface DayRow {
  date: string;
  income: Decimal;
  expenses: Decimal;
}

/**
 * GET /financial-progress/comparison (decision #16). KPIs and the category matrix compare M with
 * M−1 over equivalent periods; `window` only sizes the trend. Sums come from SQL grouped by day and
 * type (partner-filtered); the formulas live in domain/month-comparison and common/period-totals.
 */
@Injectable()
export class GetFinancialProgressQuery {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async execute(ctx: HouseholdContext, input: FinancialProgressQuery): Promise<FinancialProgressResponse> {
    const household = await this.prisma.household.findUniqueOrThrow({
      where: { id: ctx.householdId },
      select: { timezone: true, defaultCurrency: true },
    });
    const today = todayInTimeZone(this.clock.now(), household.timezone);
    const year = input.year ?? parseInt(today.slice(0, 4), 10);
    const month = input.month ?? parseInt(today.slice(5, 7), 10);
    const periods = resolveComparisonPeriods(year, month, today);
    const trend = trendMonths(year, month, input.window, periods);

    const partnerWhere = paidByPartnerWhere(ctx.householdId, input.partner);
    const inRange = (r: DateRange) => ({ gte: dateOnlyToDate(r.from), lte: dateOnlyToDate(r.to) });
    const expensesByCategory = (r: DateRange) =>
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { householdId: ctx.householdId, type: 'EXPENSE', transactionDate: inRange(r), ...partnerWhere },
        _sum: { amount: true },
      });

    const [daily, currentByCategory, previousByCategory] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['transactionDate', 'type'],
        // The trend's first month always starts on or before the previous period.
        where: { householdId: ctx.householdId, transactionDate: inRange({ from: trend[0].from, to: periods.current.to }), ...partnerWhere },
        _sum: { amount: true },
      }),
      expensesByCategory(periods.current),
      expensesByCategory(periods.previous),
    ]);

    const days: DayRow[] = daily.map((g) => ({
      date: dateToDateOnly(g.transactionDate),
      income: g.type === 'INCOME' ? dec(g._sum.amount) : new Decimal(0),
      expenses: g.type === 'EXPENSE' ? dec(g._sum.amount) : new Decimal(0),
    }));
    const totalsIn = (r: DateRange) => {
      let income = new Decimal(0);
      let expenses = new Decimal(0);
      for (const d of days) {
        if (d.date < r.from || d.date > r.to) continue;
        income = income.plus(d.income);
        expenses = expenses.plus(d.expenses);
      }
      return calculatePeriodTotals(income, expenses);
    };
    const cur = totalsIn(periods.current);
    const prev = totalsIn(periods.previous);

    const categoryIds = [...new Set([...currentByCategory, ...previousByCategory].map((g) => g.categoryId))];
    const categories = await this.prisma.category.findMany({
      where: { householdId: ctx.householdId, id: { in: categoryIds } },
      select: categorySelect,
    });
    const sumFor = (groups: typeof currentByCategory, id: string) => dec(groups.find((g) => g.categoryId === id)?._sum.amount ?? null);
    const categoryRows = compareCategories(
      categories.map((category) => ({
        category,
        current: sumFor(currentByCategory, category.id),
        previous: sumFor(previousByCategory, category.id),
      })),
    );
    const savingsRate = compareRates(cur.savingsRate, prev.savingsRate);

    return {
      year,
      month,
      window: input.window,
      partner: input.partner ?? null,
      currency: household.defaultCurrency,
      current: periods.current,
      previous: periods.previous,
      isPartial: periods.isPartial,
      kpis: {
        totalSpending: money(compareMoney(cur.expenses, prev.expenses)),
        householdIncome: money(compareMoney(cur.income, prev.income)),
        netCashFlowBuffer: money(compareMoney(cur.netCashFlowBuffer, prev.netCashFlowBuffer)),
        savingsRate: {
          current: fixed(savingsRate.current),
          previous: fixed(savingsRate.previous),
          changePoints: fixed(savingsRate.changePoints),
        },
      },
      trend: trend.map((t) => {
        const totals = totalsIn(t);
        return {
          year: t.year,
          month: t.month,
          from: t.from,
          to: t.to,
          income: totals.income.toFixed(2),
          expenses: totals.expenses.toFixed(2),
          netCashFlowBuffer: totals.netCashFlowBuffer.toFixed(2),
          isPartial: t.isPartial,
        };
      }),
      categories: categoryRows.map((r) => ({
        category: r.category,
        current: r.current.toFixed(2),
        previous: r.previous.toFixed(2),
        varianceAmount: r.varianceAmount.toFixed(2),
        variancePercent: fixed(r.variancePercent),
      })),
    };
  }
}
