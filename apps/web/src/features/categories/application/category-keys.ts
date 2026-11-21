import type { CategoryListFilters } from '@/features/categories/infrastructure/categories-api';

export const categoryKeys = {
  all: ['categories'] as const,
  list: (filters: CategoryListFilters) => [...categoryKeys.all, 'list', filters] as const,
};
