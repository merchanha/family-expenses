import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateCategoryInput, UpdateCategoryInput } from '@tandem/shared';
import { categoryKeys } from '@/features/categories/application/category-keys';
import { createCategory, deleteCategory, updateCategory } from '@/features/categories/infrastructure/categories-api';

/**
 * Category changes show up on transactions (name/icon/color are embedded in
 * each transaction), so they refresh transaction lists too.
 */
function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    ]);
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({ mutationFn: (input: CreateCategoryInput) => createCategory(input), onSuccess: invalidate });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) => updateCategory(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({ mutationFn: (id: string) => deleteCategory(id), onSuccess: invalidate });
}
