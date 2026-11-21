import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiErrorCode, createCategorySchema, type Category, type TransactionType, type z } from '@tandem/shared';
import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';
import { useCreateCategory, useUpdateCategory } from '@/features/categories/application/use-category-mutations';
import { CATEGORY_COLORS, CATEGORY_ICON_NAMES, CATEGORY_ICONS } from '@/features/categories/domain/category-icons';
import { TYPE_LABEL } from '@/features/categories/domain/category-display';

type CategoryForm = z.input<typeof createCategorySchema>;
const FIELDS = ['name', 'type', 'icon', 'color'] as const;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Edit this category; omit to create. */
  category?: Category | null;
  /** Initial type when creating. */
  defaultType?: TransactionType;
}

function defaults(category: Category | null | undefined, type: TransactionType): CategoryForm {
  return {
    name: category?.name ?? '',
    type: category?.type ?? type,
    icon: category?.icon ?? 'sell',
    color: category?.color ?? CATEGORY_COLORS[0],
  };
}

/** Create or edit a category (envelope). The type can't change after creation. */
export function CategoryFormDialog({ open, onOpenChange, category, defaultType = 'EXPENSE' }: CategoryFormDialogProps) {
  const editing = !!category;
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CategoryForm>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: defaults(category, defaultType),
  });
  const { errors, isSubmitting } = form.formState;
  const [type, icon, color] = useWatch({ control: form.control, name: ['type', 'icon', 'color'] });

  useEffect(() => {
    if (open) {
      form.reset(defaults(category, defaultType));
      setFormError(null);
    }
  }, [open, category, defaultType, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (category) {
        await update.mutateAsync({
          id: category.id,
          input: { name: values.name, icon: values.icon ?? null, color: values.color ?? null },
        });
      } else {
        await create.mutateAsync(createCategorySchema.parse(values));
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || err.code === ApiErrorCode.CATEGORY_NAME_TAKEN)) {
        form.setError('name', { type: 'server', message: `There's already an active ${TYPE_LABEL[values.type].toLowerCase()} category with this name.` });
        return;
      }
      setFormError(applyServerErrors(err, form.setError, FIELDS));
    }
  });

  const pending = isSubmitting || create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit category' : 'New category'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Changes apply to every transaction in this category.' : 'Categories (envelopes) group your shared transactions.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-space-md">
          <FormAlert message={formError} />
          <FormField label="Name" error={errors.name?.message}>
            <Input autoComplete="off" maxLength={50} {...form.register('name')} />
          </FormField>

          <fieldset className="flex flex-col gap-1.5" disabled={editing}>
            <legend className="mb-1.5 text-label-md text-on-surface">Type</legend>
            <div className="grid grid-cols-2 gap-1 rounded-base bg-surface-container-low p-1">
              {(['EXPENSE', 'INCOME'] as const).map((t) => (
                <label
                  key={t}
                  className={cn(
                    'flex min-h-10 cursor-pointer items-center justify-center rounded-[6px] text-label-md has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                    type === t ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant',
                    editing && 'cursor-not-allowed opacity-70',
                  )}
                >
                  <input type="radio" value={t} className="sr-only" {...form.register('type')} />
                  {TYPE_LABEL[t]}
                </label>
              ))}
            </div>
            {editing && <p className="text-body-sm text-on-surface-variant">The type can't change once a category exists.</p>}
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-label-md text-on-surface">Icon</legend>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_ICON_NAMES.map((name) => {
                const Icon = CATEGORY_ICONS[name]!;
                return (
                  <label
                    key={name}
                    title={name.replace(/_/g, ' ')}
                    className={cn(
                      'flex size-10 cursor-pointer items-center justify-center rounded-base border has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                      icon === name
                        ? 'border-secondary bg-secondary-fixed text-on-secondary-fixed'
                        : 'border-transparent bg-surface-container-low text-on-surface-variant hover:text-on-surface',
                    )}
                  >
                    <input type="radio" value={name} aria-label={name.replace(/_/g, ' ')} className="sr-only" {...form.register('icon')} />
                    <Icon className="size-5" aria-hidden="true" />
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-label-md text-on-surface">Color</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((hex) => (
                <label
                  key={hex}
                  className={cn(
                    'flex size-10 cursor-pointer items-center justify-center rounded-full border-2 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                    color === hex ? 'border-on-surface' : 'border-transparent',
                  )}
                >
                  <input type="radio" value={hex} aria-label={`Color ${hex}`} className="sr-only" {...form.register('color')} />
                  {/* The swatch IS the stored hex value. */}
                  <span className="size-7 rounded-full" style={{ backgroundColor: hex }} aria-hidden="true" />
                </label>
              ))}
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
