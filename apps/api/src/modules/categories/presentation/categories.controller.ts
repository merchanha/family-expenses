import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
  z,
  type Category,
  type CategoryListResponse,
  type CreateCategoryInput,
  type DeleteCategoryResponse,
  type ListCategoriesQuery as ListCategoriesInput,
  type UpdateCategoryInput,
} from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { CurrentHousehold } from '../../../common/auth/auth.decorators';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { CreateCategoryUseCase } from '../application/create-category.use-case';
import { DeleteCategoryUseCase } from '../application/delete-category.use-case';
import { ListCategoriesQuery } from '../application/list-categories.query';
import { UpdateCategoryUseCase } from '../application/update-category.use-case';
import { toCategoryResponse } from '../infrastructure/category.mapper';

const idParamSchema = z.string().min(1).max(64);

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly listCategories: ListCategoriesQuery,
    private readonly createCategory: CreateCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
  ) {}

  @Get()
  async list(
    @CurrentHousehold() ctx: HouseholdContext,
    @Query(new ZodValidationPipe(listCategoriesQuerySchema)) query: ListCategoriesInput,
  ): Promise<CategoryListResponse> {
    return { items: (await this.listCategories.execute(ctx, query)).map(toCategoryResponse) };
  }

  @Post()
  async create(
    @CurrentHousehold() ctx: HouseholdContext,
    @Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryInput,
  ): Promise<Category> {
    return toCategoryResponse(await this.createCategory.execute(ctx, body));
  }

  @Patch(':id')
  async update(
    @CurrentHousehold() ctx: HouseholdContext,
    @Param('id', new ZodValidationPipe(idParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: UpdateCategoryInput,
  ): Promise<Category> {
    return toCategoryResponse(await this.updateCategory.execute(ctx, id, body));
  }

  /** 200 with the outcome (not 204): the client must know whether it was deleted or deactivated. */
  @Delete(':id')
  async remove(
    @CurrentHousehold() ctx: HouseholdContext,
    @Param('id', new ZodValidationPipe(idParamSchema)) id: string,
  ): Promise<DeleteCategoryResponse> {
    const { result, category } = await this.deleteCategory.execute(ctx, id);
    return { result, category: category ? toCategoryResponse(category) : null };
  }
}
