import { Injectable } from '@nestjs/common';
import { toDecimal } from '../../../common/money';
import { PrismaService } from '../../../prisma/prisma.service';
import type { BudgetCategoryRef, BudgetPatch, BudgetRecord, NewBudget, YearMonth } from '../domain/budget';
import { BudgetRepository } from '../domain/budget.repository';
import { toBudgetRecord } from './budget.mapper';

const categoryRef = { select: { id: true, type: true, isActive: true } } as const;

@Injectable()
export class PrismaBudgetRepository extends BudgetRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findCategory(householdId: string, categoryId: string): Promise<BudgetCategoryRef | null> {
    return this.prisma.category.findFirst({ where: { id: categoryId, householdId }, ...categoryRef });
  }

  async findByCategoryMonth(householdId: string, categoryId: string, period: YearMonth): Promise<BudgetRecord | null> {
    const row = await this.prisma.budget.findFirst({ where: { householdId, categoryId, ...period } });
    return row ? toBudgetRecord(row) : null;
  }

  async householdCurrency(householdId: string): Promise<string> {
    const h = await this.prisma.household.findUniqueOrThrow({ where: { id: householdId }, select: { defaultCurrency: true } });
    return h.defaultCurrency;
  }

  async create(budget: NewBudget): Promise<BudgetRecord> {
    return toBudgetRecord(await this.prisma.budget.create({ data: { ...budget, amount: toDecimal(budget.amount) } }));
  }

  async update(householdId: string, budgetId: string, patch: BudgetPatch): Promise<BudgetRecord> {
    // updateMany keeps the householdId scope in the WHERE; then read back.
    await this.prisma.budget.updateMany({
      where: { id: budgetId, householdId },
      data: { ...patch, amount: toDecimal(patch.amount) },
    });
    return toBudgetRecord(await this.prisma.budget.findFirstOrThrow({ where: { id: budgetId, householdId } }));
  }

  async delete(householdId: string, budgetId: string): Promise<boolean> {
    const { count } = await this.prisma.budget.deleteMany({ where: { id: budgetId, householdId } });
    return count > 0;
  }

  async listForMonth(householdId: string, period: YearMonth): Promise<(BudgetRecord & { category: BudgetCategoryRef })[]> {
    const rows = await this.prisma.budget.findMany({ where: { householdId, ...period }, include: { category: categoryRef } });
    return rows.map((r) => ({ ...toBudgetRecord(r), category: r.category }));
  }

  async createMany(budgets: NewBudget[]): Promise<number> {
    const { count } = await this.prisma.budget.createMany({
      data: budgets.map((b) => ({ ...b, amount: toDecimal(b.amount) })),
      skipDuplicates: true,
    });
    return count;
  }
}
