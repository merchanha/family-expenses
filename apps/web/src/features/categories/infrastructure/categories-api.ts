import {
  categoryListResponseSchema,
  categorySchema,
  deleteCategoryResponseSchema,
  type Category,
  type CategoryListResponse,
  type CreateCategoryInput,
  type DeleteCategoryResponse,
  type TransactionType,
  type UpdateCategoryInput,
} from '@tandem/shared';
import { api } from '@/lib/api';

export interface CategoryListFilters {
  type?: TransactionType;
  includeInactive?: boolean;
}

export function listCategories(filters: CategoryListFilters = {}): Promise<CategoryListResponse> {
  return api.get('/categories', {
    schema: categoryListResponseSchema,
    query: { type: filters.type, includeInactive: filters.includeInactive ? 'true' : undefined },
  });
}

export function createCategory(input: CreateCategoryInput): Promise<Category> {
  return api.post('/categories', input, { schema: categorySchema });
}

export function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  return api.patch(`/categories/${encodeURIComponent(id)}`, input, { schema: categorySchema });
}

/** Unused → deleted; used by any transaction/budget → deactivated (BUSINESS_RULES §3). */
export function deleteCategory(id: string): Promise<DeleteCategoryResponse> {
  return api.delete(`/categories/${encodeURIComponent(id)}`, { schema: deleteCategoryResponseSchema });
}
