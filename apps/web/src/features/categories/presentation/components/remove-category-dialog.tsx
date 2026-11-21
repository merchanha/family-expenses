import { useState } from 'react';
import type { Category } from '@tandem/shared';
import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { actionErrorMessage } from '@/lib/form-errors';
import { useDeleteCategory } from '@/features/categories/application/use-category-mutations';

interface RemoveCategoryDialogProps {
  category: Category | null;
  onOpenChange(open: boolean): void;
}

/**
 * A category used by any transaction is deactivated, never deleted (BUSINESS_RULES §3);
 * the API decides, and the copy says which will happen.
 */
export function RemoveCategoryDialog({ category, onOpenChange }: RemoveCategoryDialogProps) {
  const remove = useDeleteCategory();
  const [error, setError] = useState<string | null>(null);
  const used = (category?.transactionCount ?? 0) > 0;

  const confirm = async () => {
    if (!category) return;
    setError(null);
    try {
      await remove.mutateAsync(category.id);
      onOpenChange(false);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  };

  return (
    <Dialog
      open={!!category}
      onOpenChange={(open) => {
        if (!open) setError(null);
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{used ? `Deactivate ${category?.name}?` : `Delete ${category?.name}?`}</DialogTitle>
          <DialogDescription>
            {used
              ? 'This category has transactions, so it will be deactivated instead of deleted. Past transactions keep it; you just can’t pick it for new ones. You can reactivate it later.'
              : 'Nothing uses this category yet, so it will be deleted.'}
          </DialogDescription>
        </DialogHeader>
        <FormAlert message={error} />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending ? 'Working…' : used ? 'Deactivate' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
