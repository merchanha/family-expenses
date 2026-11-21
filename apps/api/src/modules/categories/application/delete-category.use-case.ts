import { Injectable } from '@nestjs/common';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import type { CategoryRecord } from '../domain/category';
import { CategoryNotFoundError } from '../domain/category.errors';
import { CategoryRepository } from '../domain/category.repository';

export type DeleteCategoryResult = { result: 'DELETED'; category: null } | { result: 'DEACTIVATED'; category: CategoryRecord };

/**
 * BUSINESS_RULES §3.8: a category used by any transaction (or budget) is deactivated, never deleted,
 * so history keeps its category. Unused categories are hard-deleted.
 */
@Injectable()
export class DeleteCategoryUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(ctx: HouseholdContext, categoryId: string): Promise<DeleteCategoryResult> {
    const current = await this.categories.findById(ctx.householdId, categoryId);
    if (!current) throw new CategoryNotFoundError();
    const unused = (await this.categories.countUsage(ctx.householdId, categoryId)) === 0;
    if (unused && (await this.categories.deleteIfUnused(ctx.householdId, categoryId))) {
      return { result: 'DELETED', category: null };
    }
    const category = await this.categories.update(ctx.householdId, categoryId, { isActive: false });
    return { result: 'DEACTIVATED', category };
  }
}
