import { useEffect, useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownLeft, ArrowUpRight, Check, CirclePlus, Pencil } from 'lucide-react';
import { ApiErrorCode, type Transaction, type TransactionType } from '@tandem/shared';
import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { actionErrorMessage, applyServerErrors } from '@/lib/form-errors';
import { todayIso } from '@/lib/month';
import { cn } from '@/lib/utils';
import { useCategories } from '@/features/categories';
import { memberLabel, useCurrentHousehold } from '@/features/households';
import { useAuthenticatedSession } from '@/lib/auth/session-context';
import {
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from '@/features/transactions/application/use-transaction-mutations';
import { TYPE_LABEL, whoPaidOptions } from '@/features/transactions/domain/transaction-display';
import {
  changedFields,
  emptyFormValues,
  toFormValues,
  transactionFormSchema,
  type TransactionFormOutput,
  type TransactionFormValues,
} from '@/features/transactions/domain/transaction-form';

const FIELDS = ['type', 'amount', 'description', 'categoryId', 'transactionDate', 'paidById', 'notes'] as const;
const TYPE_ICON = { EXPENSE: ArrowUpRight, INCOME: ArrowDownLeft } as const;
const SLOT_SELECTED = {
  PARTNER_1: 'border-partner-1 bg-partner-1-container text-on-partner-1-container',
  PARTNER_2: 'border-partner-2 bg-partner-2-container text-on-partner-2-container',
} as const;
const SLOT_DOT = { PARTNER_1: 'bg-partner-1', PARTNER_2: 'bg-partner-2' } as const;

/** Category errors from the API (422) belong on the category field. */
const CATEGORY_CODES: string[] = [
  ApiErrorCode.INVALID_CATEGORY,
  ApiErrorCode.CATEGORY_INACTIVE,
  ApiErrorCode.CATEGORY_TYPE_MISMATCH,
];

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Edit this transaction; null → Add Transaction. */
  transaction: Transaction | null;
  defaultType?: TransactionType;
}

function yesterday(iso: string): string {
  // Calendar-date arithmetic at UTC midday (not money): safe from DST/timezones.
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! - 1, 12)).toISOString().slice(0, 10);
}

/** Add / Edit Transaction (design/transactions_add_expense_modal): type, amount, who paid, description, category, date, notes. */
export function TransactionFormDialog({ open, onOpenChange, transaction, defaultType = 'EXPENSE' }: TransactionFormDialogProps) {
  const editing = !!transaction;
  const { user } = useAuthenticatedSession();
  const household = useCurrentHousehold();
  const timezone = household.data?.household.timezone;
  const today = todayIso(timezone);

  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addAnother, setAddAnother] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const ids = { amount: useId(), category: useId(), date: useId() };

  const form = useForm<TransactionFormValues, unknown, TransactionFormOutput>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: emptyFormValues(defaultType, today, user.id),
  });
  const { errors, isSubmitting } = form.formState;
  const [type, paidById, categoryId, transactionDate] = useWatch({
    control: form.control,
    name: ['type', 'paidById', 'categoryId', 'transactionDate'],
  });

  useEffect(() => {
    if (!open) return;
    form.reset(transaction ? toFormValues(transaction) : emptyFormValues(defaultType, todayIso(timezone), user.id));
    setFormError(null);
    setConfirmDelete(false);
    setSavedCount(0);
    // Only when the dialog opens or switches target; not when the timezone query settles mid-edit.
  }, [open, transaction, defaultType]);

  const categories = useCategories({ type });
  const options = categories.data?.items ?? [];
  // Editing a transaction whose category was deactivated: keep it selectable as-is.
  const current = transaction?.category;
  const categoryOptions =
    current && current.type === type && !options.some((c) => c.id === current.id)
      ? [...options, { id: current.id, name: `${current.name} (inactive)` }]
      : options;

  const payers = whoPaidOptions(household.data?.members ?? [], memberLabel);

  const setType = (next: TransactionType) => {
    if (next === type) return;
    form.setValue('type', next);
    form.setValue('categoryId', '', { shouldValidate: false }); // categories are per type
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (transaction) {
        const patch = changedFields(transaction, values);
        if (Object.keys(patch).length) await update.mutateAsync({ id: transaction.id, input: patch });
        onOpenChange(false);
        return;
      }
      await create.mutateAsync(values);
      if (addAnother) {
        // Keep the context (type, payer, date, category); clear what changes per entry.
        form.reset({ ...values, paidById: values.paidById ?? '', amount: '', description: '', notes: '' });
        setSavedCount((n) => n + 1);
      } else {
        onOpenChange(false);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.code && CATEGORY_CODES.includes(err.code)) {
        form.setError('categoryId', { type: 'server', message: err.message });
        return;
      }
      if (err instanceof ApiError && err.status === 422 && err.code === ApiErrorCode.PAID_BY_NOT_MEMBER) {
        form.setError('paidById', { type: 'server', message: err.message });
        return;
      }
      setFormError(
        applyServerErrors(err, form.setError, FIELDS, {
          404: 'This transaction no longer exists. It may have been deleted by your partner.',
        }),
      );
    }
  });

  const onDelete = async () => {
    if (!transaction) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setFormError(null);
    try {
      await remove.mutateAsync(transaction.id);
      onOpenChange(false);
    } catch (err) {
      setFormError(actionErrorMessage(err));
    }
  };

  const pending = isSubmitting || create.isPending || update.isPending;
  const TitleIcon = editing ? Pencil : CirclePlus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-space-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-space-sm">
            <TitleIcon className="size-5" aria-hidden="true" />
            {editing ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editing ? 'Change or delete this transaction.' : 'Record a shared expense or income.'} Tip: ⌘K or Ctrl+K opens this from anywhere.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-space-lg">
          <FormAlert message={formError} />
          {savedCount > 0 && <FormAlert tone="success" message={`Saved ${savedCount} transaction${savedCount === 1 ? '' : 's'}. Add the next one.`} />}

          <div role="radiogroup" aria-label="Transaction type" className="grid grid-cols-2 gap-1 rounded-md bg-surface-container-low p-1">
            {(['EXPENSE', 'INCOME'] as const).map((t) => {
              const Icon = TYPE_ICON[t];
              const selected = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setType(t)}
                  className={cn(
                    'flex min-h-10 items-center justify-center gap-1.5 rounded-base text-label-md transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                    selected
                      ? cn('bg-surface-container-lowest shadow-level-1', t === 'EXPENSE' ? 'text-negative' : 'text-positive-text')
                      : 'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {TYPE_LABEL[t]}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-1 rounded-lg bg-surface-container-low px-space-md py-space-lg">
            <label htmlFor={ids.amount} className="text-label-sm text-on-surface-variant uppercase">
              Transaction amount
            </label>
            <div className="flex items-baseline gap-space-sm">
              <span className="font-headline text-headline-md text-on-surface-variant" aria-hidden="true">
                $
              </span>
              <input
                id={ids.amount}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby={errors.amount ? `${ids.amount}-error` : `${ids.amount}-hint`}
                className="w-full max-w-60 bg-transparent text-center font-headline text-stat-lg-mobile text-on-surface tabular outline-none placeholder:text-on-surface-variant/40 md:text-stat-lg"
                {...form.register('amount')}
              />
            </div>
            {errors.amount ? (
              <p id={`${ids.amount}-error`} className="text-body-sm text-negative">
                {errors.amount.message}
              </p>
            ) : (
              <p id={`${ids.amount}-hint`} className="text-body-sm text-on-surface-variant">
                ARS · e.g. 1.234,50
              </p>
            )}
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-label-sm text-on-surface-variant uppercase">
              {type === 'EXPENSE' ? 'Who paid for this?' : 'Who received it?'}
            </legend>
            <div className="grid grid-cols-3 gap-space-sm">
              {payers.map((p) => {
                const selected = paidById === p.value;
                return (
                  <label
                    key={p.value || 'shared'}
                    className={cn(
                      'flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 px-1 text-center text-label-md has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                      selected
                        ? p.slot
                          ? SLOT_SELECTED[p.slot]
                          : 'border-on-surface-variant bg-surface-container text-on-surface'
                        : 'border-transparent bg-surface-container-low text-on-surface-variant hover:text-on-surface',
                    )}
                  >
                    <input type="radio" value={p.value} className="sr-only" {...form.register('paidById')} />
                    <span className="flex items-center gap-1" aria-hidden="true">
                      {p.slot ? (
                        <span className={cn('size-2.5 rounded-full', SLOT_DOT[p.slot])} />
                      ) : (
                        <>
                          <span className="size-2.5 rounded-full bg-partner-1" />
                          <span className="size-2.5 rounded-full bg-partner-2" />
                        </>
                      )}
                    </span>
                    <span className="max-w-full truncate">{p.label}</span>
                  </label>
                );
              })}
            </div>
            {errors.paidById && <p className="text-body-sm text-negative">{errors.paidById.message}</p>}
          </fieldset>

          <FormField label="Description" error={errors.description?.message}>
            <Input autoComplete="off" maxLength={200} placeholder="e.g. Supermarket" {...form.register('description')} />
          </FormField>

          <div className="grid gap-space-md sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.category} className="text-label-md text-on-surface">
                Category
              </label>
              <select
                id={ids.category}
                aria-invalid={errors.categoryId ? true : undefined}
                aria-describedby={errors.categoryId ? `${ids.category}-error` : undefined}
                disabled={categories.isPending}
                className={cn(
                  'h-11 w-full rounded-base border border-transparent bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-negative-border',
                  !categoryId && 'text-on-surface-variant',
                )}
                {...form.register('categoryId')}
              >
                <option value="">{categories.isPending ? 'Loading…' : 'Choose a category'}</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p id={`${ids.category}-error`} className="text-body-sm text-negative">
                  {errors.categoryId.message}
                </p>
              )}
              {categories.isError && <p className="text-body-sm text-negative">Couldn't load categories.</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-space-sm">
                <label htmlFor={ids.date} className="text-label-md text-on-surface">
                  Date
                </label>
                <span className="flex gap-1">
                  {[
                    { label: 'Today', value: today },
                    { label: 'Yesterday', value: yesterday(today) },
                  ].map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      aria-pressed={transactionDate === d.value}
                      onClick={() => form.setValue('transactionDate', d.value, { shouldValidate: true })}
                      className={cn(
                        'rounded-sm px-1.5 py-0.5 text-label-sm',
                        transactionDate === d.value ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-low text-on-surface-variant',
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </span>
              </div>
              <Input
                id={ids.date}
                type="date"
                className="tabular"
                aria-invalid={errors.transactionDate ? true : undefined}
                {...form.register('transactionDate')}
              />
              {errors.transactionDate && <p className="text-body-sm text-negative">{errors.transactionDate.message}</p>}
            </div>
          </div>

          <FormField label="Notes (optional)" error={errors.notes?.message}>
            <textarea
              rows={2}
              maxLength={1000}
              className="w-full rounded-base border border-transparent bg-surface-container-low px-3 py-2 text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              {...form.register('notes')}
            />
          </FormField>

          <div className="-mx-space-lg -mb-space-lg flex flex-col gap-space-sm border-t border-hairline bg-surface-container-low px-space-lg py-space-md sm:flex-row sm:items-center sm:justify-between">
            {editing ? (
              <Button type="button" variant="destructive" onClick={onDelete} disabled={remove.isPending}>
                {remove.isPending ? 'Deleting…' : confirmDelete ? 'Confirm delete' : 'Delete'}
              </Button>
            ) : (
              <label className="flex min-h-10 cursor-pointer items-center gap-2 text-label-md text-on-surface-variant">
                <input
                  type="checkbox"
                  className="size-4 accent-secondary"
                  checked={addAnother}
                  onChange={(e) => setAddAnother(e.target.checked)}
                />
                Add another afterwards
              </label>
            )}
            <div className="flex flex-col-reverse gap-space-sm sm:flex-row">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                <Check aria-hidden="true" />
                {pending ? 'Saving…' : editing ? 'Save changes' : 'Save Transaction'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
