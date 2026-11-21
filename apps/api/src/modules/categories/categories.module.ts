import { Module } from '@nestjs/common';
import { CreateCategoryUseCase } from './application/create-category.use-case';
import { DeleteCategoryUseCase } from './application/delete-category.use-case';
import { ListCategoriesQuery } from './application/list-categories.query';
import { UpdateCategoryUseCase } from './application/update-category.use-case';
import { CategoryRepository } from './domain/category.repository';
import { PrismaCategoryRepository } from './infrastructure/prisma-category.repository';
import { CategoriesController } from './presentation/categories.controller';

@Module({
  controllers: [CategoriesController],
  providers: [
    { provide: CategoryRepository, useClass: PrismaCategoryRepository },
    ListCategoriesQuery,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
  ],
})
export class CategoriesModule {}
