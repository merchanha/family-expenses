import { Injectable } from '@nestjs/common';
import type { ListCategoriesQuery as ListCategoriesInput } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import type { CategoryRecord } from '../domain/category';
import { CategoryRepository } from '../domain/category.repository';

/** Active categories by default; includeInactive=true adds deactivated ones (history, settings). */
@Injectable()
export class ListCategoriesQuery {
  constructor(private readonly categories: CategoryRepository) {}

  execute(ctx: HouseholdContext, input: ListCategoriesInput): Promise<CategoryRecord[]> {
    return this.categories.list(ctx.householdId, { type: input.type, includeInactive: input.includeInactive ?? false });
  }
}
