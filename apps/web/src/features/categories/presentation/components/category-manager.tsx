import { useState } from 'react';
import { PieChart, Plus } from 'lucide-react';
import type { Category, TransactionType } from '@tandem/shared';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { actionErrorMessage } from '@/lib/form-errors';
import { useCategories } from '@/features/categories/application/use-categories';
import { useUpdateCategory } from '@/features/categories/application/use-category-mutations';
import { TYPE_PLURAL } from '@/features/categories/domain/category-display';
import { CategoryFormDialog } from '@/features/categories/presentation/components/category-form-dialog';
import { CategoryList } from '@/features/categories/presentation/components/category-list';
import { RemoveCategoryDialog } from '@/features/categories/presentation/components/remove-category-dialog';

const TYPES: TransactionType[] = ['EXPENSE', 'INCOME'];

function CategoriesSkeleton() {
  return (
    <div className="flex flex-col gap-space-sm" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

/**
 * Category management on /categories (create, edit name/icon/color, deactivate, reactivate) for both
 * types. Budgets for the month are the envelopes above it (budgets feature).
 */
export function CategoryManager() {
  const [showInactive, setShowInactive] = useState(false);
  const query = useCategories({ includeInactive: showInactive });
  const reactivate = useUpdateCategory();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [createType, setCreateType] = useState<TransactionType>('EXPENSE');
  const [removing, setRemoving] = useState<Category | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openCreate = (type: TransactionType) => {
    setEditing(null);
    setCreateType(type);
    setFormOpen(true);
  };
  const openEdit = (category: Category) => {
    setEditing(category);
    setFormOpen(true);
  };
  const onReactivate = (category: Category) => {
    setActionError(null);
    reactivate.mutate(
      { id: category.id, input: { isActive: true } },
      { onError: (err) => setActionError(actionErrorMessage(err)) },
    );
  };

  return (
    <section aria-labelledby="manage-categories" className="flex flex-col gap-space-lg">
      <div className="flex flex-wrap items-end justify-between gap-space-md">
        <div>
          <h3 id="manage-categories" className="font-headline text-headline-md text-on-surface">Manage categories</h3>
          <p className="text-body-md text-on-surface-variant">Names, icons and colors for expense and income categories.</p>
        </div>
        <div className="flex items-center gap-space-sm">
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-label-md text-on-surface-variant">
            <input
              type="checkbox"
              className="size-4 accent-secondary"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
          <Button onClick={() => openCreate('EXPENSE')}>
            <Plus aria-hidden="true" />
            New category
          </Button>
        </div>
      </div>

      <FormAlert message={actionError} />

      {query.isPending ? (
        <CategoriesSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} title="Couldn't load categories" />
      ) : (
        TYPES.map((type) => {
          const items = query.data.items.filter((c) => c.type === type);
          return (
            <section key={type} aria-labelledby={`categories-${type}`} className="flex flex-col gap-space-sm">
              <h4 id={`categories-${type}`} className="text-label-sm text-on-surface-variant uppercase">
                {TYPE_PLURAL[type]}
              </h4>
              {items.length ? (
                <CategoryList
                  categories={items}
                  onEdit={openEdit}
                  onRemove={setRemoving}
                  onReactivate={onReactivate}
                  reactivatingId={reactivate.isPending ? reactivate.variables?.id : null}
                />
              ) : (
                <EmptyState
                  icon={PieChart}
                  title={type === 'EXPENSE' ? 'No expense categories yet' : 'No income categories yet'}
                  action={
                    <Button variant="secondary" onClick={() => openCreate(type)}>
                      <Plus aria-hidden="true" />
                      Add category
                    </Button>
                  }
                />
              )}
            </section>
          );
        })
      )}

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editing} defaultType={createType} />
      <RemoveCategoryDialog category={removing} onOpenChange={(open) => !open && setRemoving(null)} />
    </section>
  );
}
