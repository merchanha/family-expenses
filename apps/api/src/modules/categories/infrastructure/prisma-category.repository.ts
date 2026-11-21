import { Injectable } from '@nestjs/common';
import { Prisma, type Category as CategoryRow } from '@prisma/client';
import type { TransactionType } from '@tandem/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import type { CategoryListFilter, CategoryPatch, CategoryRecord, NewCategory } from '../domain/category';
import { CategoryRepository } from '../domain/category.repository';

const withCount = { _count: { select: { transactions: true } } } as const;
type Row = CategoryRow & { _count: { transactions: number } };

const toRecord = ({ _count, ...c }: Row): CategoryRecord => ({ ...c, transactionCount: _count.transactions });

@Injectable()
export class PrismaCategoryRepository extends CategoryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(householdId: string, filter: CategoryListFilter): Promise<CategoryRecord[]> {
    const rows = await this.prisma.category.findMany({
      where: { householdId, type: filter.type, ...(filter.includeInactive ? {} : { isActive: true }) },
      include: withCount,
      // Postgres orders enums by declaration (INCOME, EXPENSE): desc puts EXPENSE first.
      // Inactive after active within a type.
      orderBy: [{ type: 'desc' }, { isActive: 'desc' }, { name: 'asc' }],
    });
    return rows.map(toRecord);
  }

  async findById(householdId: string, categoryId: string): Promise<CategoryRecord | null> {
    const row = await this.prisma.category.findFirst({ where: { id: categoryId, householdId }, include: withCount });
    return row ? toRecord(row) : null;
  }

  async existsActiveWithName(householdId: string, type: TransactionType, name: string, excludeId?: string): Promise<boolean> {
    const hit = await this.prisma.category.findFirst({
      where: {
        householdId,
        type,
        isActive: true,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return hit !== null;
  }

  async create(category: NewCategory): Promise<CategoryRecord> {
    return toRecord(await this.prisma.category.create({ data: category, include: withCount }));
  }

  async update(householdId: string, categoryId: string, patch: CategoryPatch): Promise<CategoryRecord> {
    // updateMany keeps the householdId scope in the WHERE; then read back.
    await this.prisma.category.updateMany({ where: { id: categoryId, householdId }, data: patch });
    const row = await this.prisma.category.findFirstOrThrow({ where: { id: categoryId, householdId }, include: withCount });
    return toRecord(row);
  }

  async countUsage(householdId: string, categoryId: string): Promise<number> {
    const [transactions, budgets] = await Promise.all([
      this.prisma.transaction.count({ where: { householdId, categoryId } }),
      this.prisma.budget.count({ where: { householdId, categoryId } }),
    ]);
    return transactions + budgets;
  }

  async deleteIfUnused(householdId: string, categoryId: string): Promise<boolean> {
    try {
      const { count } = await this.prisma.category.deleteMany({ where: { id: categoryId, householdId } });
      return count > 0;
    } catch (e) {
      // P2003: FK (onDelete: Restrict) — a transaction/budget was added between the count and the delete.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') return false;
      throw e;
    }
  }
}
