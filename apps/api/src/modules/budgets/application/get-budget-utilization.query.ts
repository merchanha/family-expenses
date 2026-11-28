import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import type { BudgetUtilizationQuery, BudgetUtilizationResponse, PartnerSlot } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { Clock } from '../../../common/clock';
import { paidByPartnerWhere } from '../../../common/partner-filter';
import { dateOnlyToDate, periodOrCurrentMonth } from '../../../common/period';
import { PrismaService } from '../../../prisma/prisma.service';
import { calculateEnvelope, summarizeEnvelopes } from '../domain/budget-utilization';

const categorySelect = { id: true, name: true, icon: true, color: true, type: true, isActive: true } as const;
const fixed = (d: Decimal | null) => (d === null ? null : d.toFixed(2));

interface PaidBy {
  partner1: Decimal;
  partner2: Decimal;
  shared: Decimal;
}
const zeroPaidBy = (): PaidBy => ({ partner1: new Decimal(0), partner2: new Decimal(0), shared: new Decimal(0) });

/**
 * GET /budgets/utilization — the envelope list + KPIs for one month (decision #18). Spend is summed in
 * SQL by category and paid-by over transactionDate, with the partner filter (Shared excluded under a
 * filter, #11); every formula lives in domain/budget-utilization.
 */
@Injectable()
export class GetBudgetUtilizationQuery {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async execute(ctx: HouseholdContext, input: BudgetUtilizationQuery): Promise<BudgetUtilizationResponse> {
    const household = await this.prisma.household.findUniqueOrThrow({
      where: { id: ctx.householdId },
      select: {
        timezone: true,
        defaultCurrency: true,
        defaultSplitPartner1Percent: true,
        members: { select: { userId: true, partnerSlot: true } },
      },
    });
    const period = periodOrCurrentMonth({ year: input.year, month: input.month }, this.clock.now(), household.timezone);
    const year = period.year!;
    const month = period.month!;

    const [categories, budgets, groups] = await Promise.all([
      this.prisma.category.findMany({ where: { householdId: ctx.householdId, type: 'EXPENSE' }, select: categorySelect }),
      this.prisma.budget.findMany({ where: { householdId: ctx.householdId, year, month } }),
      this.prisma.transaction.groupBy({
        by: ['categoryId', 'paidById'],
        where: {
          householdId: ctx.householdId,
          type: 'EXPENSE',
          transactionDate: { gte: dateOnlyToDate(period.from), lte: dateOnlyToDate(period.to) },
          ...paidByPartnerWhere(ctx.householdId, input.partner),
        },
        _sum: { amount: true },
      }),
    ]);

    const slotOf = new Map<string, PartnerSlot>(household.members.map((m) => [m.userId, m.partnerSlot]));
    const paidByCategory = new Map<string, PaidBy>();
    for (const g of groups) {
      const amount = new Decimal(g._sum.amount ? g._sum.amount.toString() : 0);
      const entry = paidByCategory.get(g.categoryId) ?? zeroPaidBy();
      // paidBy is always a member when written (PAID_BY_NOT_MEMBER); anything else counts as Shared.
      const slot = g.paidById ? slotOf.get(g.paidById) : undefined;
      if (slot === 'PARTNER_1') entry.partner1 = entry.partner1.plus(amount);
      else if (slot === 'PARTNER_2') entry.partner2 = entry.partner2.plus(amount);
      else entry.shared = entry.shared.plus(amount);
      paidByCategory.set(g.categoryId, entry);
    }
    const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b]));

    const rows = categories
      .map((category) => {
        const paidBy = paidByCategory.get(category.id) ?? zeroPaidBy();
        const spent = paidBy.partner1.plus(paidBy.partner2).plus(paidBy.shared);
        const budget = budgetByCategory.get(category.id) ?? null;
        const budgetAmount = budget ? new Decimal(budget.amount.toString()) : null;
        return { category, paidBy, spent, budget, budgetAmount };
      })
      // Every active expense category; inactive ones only with a budget or spend this month.
      .filter((r) => r.category.isActive || r.budget !== null || !r.spent.isZero())
      .sort((a, b) => a.category.name.localeCompare(b.category.name) || a.category.id.localeCompare(b.category.id));

    const summary = summarizeEnvelopes(rows.map((r) => ({ spent: r.spent, budget: r.budgetAmount })));
    return {
      period,
      partner: input.partner ?? null,
      currency: household.defaultCurrency,
      defaultSplitPartner1Percent: household.defaultSplitPartner1Percent,
      summary: {
        monthlyAllocation: summary.monthlyAllocation.toFixed(2),
        consumed: summary.consumed.toFixed(2),
        consumedPercent: fixed(summary.consumedPercent),
        status: summary.status,
        remaining: summary.remaining.toFixed(2),
        budgetCount: summary.budgetCount,
      },
      items: rows.map((r) => {
        const figures = calculateEnvelope(r.spent, r.budgetAmount);
        return {
          category: r.category,
          budget: r.budget
            ? { id: r.budget.id, amount: r.budgetAmount!.toFixed(2), splitPartner1Percent: r.budget.splitPartner1Percent }
            : null,
          spent: r.spent.toFixed(2),
          remaining: fixed(figures.remaining),
          utilization: fixed(figures.utilization),
          status: figures.status,
          paidBy: {
            partner1: r.paidBy.partner1.toFixed(2),
            partner2: r.paidBy.partner2.toFixed(2),
            shared: r.paidBy.shared.toFixed(2),
          },
        };
      }),
    };
  }
}
