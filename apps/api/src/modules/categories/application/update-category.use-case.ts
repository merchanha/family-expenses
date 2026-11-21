import { Injectable } from '@nestjs/common';
import type { UpdateCategoryInput } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import type { CategoryRecord } from '../domain/category';
import { CategoryNameTakenError, CategoryNotFoundError } from '../domain/category.errors';
import { CategoryRepository } from '../domain/category.repository';

/** Edit name/icon/color/description, or (de)activate. Type is immutable. Transactions are untouched. */
@Injectable()
export class UpdateCategoryUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(ctx: HouseholdContext, categoryId: string, input: UpdateCategoryInput): Promise<CategoryRecord> {
    const current = await this.categories.findById(ctx.householdId, categoryId);
    if (!current) throw new CategoryNotFoundError();
    const willBeActive = input.isActive ?? current.isActive;
    const name = input.name ?? current.name;
    const nameChanges = name.toLowerCase() !== current.name.toLowerCase();
    if (willBeActive && (nameChanges || !current.isActive)) {
      if (await this.categories.existsActiveWithName(ctx.householdId, current.type, name, current.id)) {
        throw new CategoryNameTakenError();
      }
    }
    return this.categories.update(ctx.householdId, categoryId, input);
  }
}
