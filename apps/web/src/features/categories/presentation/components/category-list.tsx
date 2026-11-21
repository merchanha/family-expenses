import { ArchiveRestore, Pencil, Trash2 } from 'lucide-react';
import type { Category } from '@tandem/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usageLabel } from '@/features/categories/domain/category-display';
import { CategoryIcon } from '@/features/categories/presentation/components/category-icon';

interface CategoryListProps {
  categories: Category[];
  onEdit(category: Category): void;
  onRemove(category: Category): void;
  onReactivate(category: Category): void;
  reactivatingId?: string | null;
}

export function CategoryList({ categories, onEdit, onRemove, onReactivate, reactivatingId }: CategoryListProps) {
  return (
    <ul className="divide-y divide-hairline-subtle overflow-hidden rounded-lg border border-hairline bg-surface-container-lowest shadow-level-1">
      {categories.map((c) => (
        <li key={c.id} className="flex items-center gap-space-md px-space-md py-space-sm">
          <CategoryIcon icon={c.icon} color={c.color} className={c.isActive ? undefined : 'opacity-50'} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-space-sm">
              <span className="truncate text-label-md text-on-surface">{c.name}</span>
              {c.isDefault && <Badge variant="secondary" className="bg-surface-container text-on-surface-variant">Default</Badge>}
              {!c.isActive && <Badge variant="outline">Inactive</Badge>}
            </span>
            <span className="text-body-sm text-on-surface-variant tabular">{usageLabel(c.transactionCount)}</span>
          </div>
          {c.isActive ? (
            <div className="flex shrink-0 items-center">
              <Button variant="ghost" size="icon" aria-label={`Edit ${c.name}`} onClick={() => onEdit(c)}>
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${c.transactionCount > 0 ? 'Deactivate' : 'Delete'} ${c.name}`}
                onClick={() => onRemove(c)}
              >
                <Trash2 />
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={reactivatingId === c.id}
              onClick={() => onReactivate(c)}
              aria-label={`Reactivate ${c.name}`}
            >
              <ArchiveRestore aria-hidden="true" />
              Reactivate
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
