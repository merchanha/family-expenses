import { useQuery } from '@tanstack/react-query';
import { categoryKeys } from '@/features/categories/application/category-keys';
import { listCategories, type CategoryListFilters } from '@/features/categories/infrastructure/categories-api';

/** GET /categories — active only unless `includeInactive`. */
export function useCategories(filters: CategoryListFilters = {}) {
  return useQuery({
    queryKey: categoryKeys.list(filters),
    queryFn: () => listCategories(filters),
  });
}
