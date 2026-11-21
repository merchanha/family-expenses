import { Injectable } from '@nestjs/common';
import type { CreateCategoryInput } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import type { CategoryRecord } from '../domain/category';
import { CategoryNameTakenError } from '../domain/category.errors';
import { CategoryRepository } from '../domain/category.repository';

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(ctx: HouseholdContext, input: CreateCategoryInput): Promise<CategoryRecord> {
    if (await this.categories.existsActiveWithName(ctx.householdId, input.type, input.name)) throw new CategoryNameTakenError();
    return this.categories.create({
      householdId: ctx.householdId,
      name: input.name,
      type: input.type,
      icon: input.icon ?? null,
      color: input.color ?? null,
      description: input.description ?? null,
    });
  }
}
