import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiErrorCode, type Envelope } from '@tandem/shared';
import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ApiError } from '@/lib/api';
import { actionErrorMessage, applyServerErrors } from '@/lib/form-errors';
import { monthLabel, type YearMonth } from '@/lib/month';
import { splitLabel } from '@/features/households';
import { useDeleteBudget, useUpsertBudget } from '@/features/budgets/application/use-budget-mutations';
import {
  budgetFormDefaults,
  budgetFormSchema,
  type BudgetFormOutput,
  type BudgetFormValues,
} from '@/features/budgets/domain/budget-form';

interface BudgetDrawerProps {
  /** The envelope being edited; null closes the drawer. */
  envelope: Envelope | null;
  month: YearMonth;
  defaultSplitPartner1Percent: number;
  onOpenChange(open: boolean): void;
}

const INACTIVE_MESSAGE = 'This category is inactive, so it can’t get a new budget. Reactivate it first.';

/** Envelope edit drawer (FOR-59): monthly amount + optional split, or remove the budget. */
export function BudgetDrawer({ envelope, month, defaultSplitPartner1Percent, onOpenChange }: BudgetDrawerProps) {
  const upsert = useUpsertBudget();
  const remove = useDeleteBudget();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const budget = envelope?.budget ?? null;
  const form = useForm<BudgetFormValues, unknown, BudgetFormOutput>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: budgetFormDefaults(budget),
  });
  const { errors, isSubmitting } = form.formState;
  const splitMode = useWatch({ control: form.control, name: 'splitMode' });

  useEffect(() => {
    if (envelope) {
      form.reset(budgetFormDefaults(envelope.budget));
      setFormError(null);
      setConfirmRemove(false);
    }
  }, [envelope, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!envelope) return;
    setFormError(null);
    try {
      await upsert.mutateAsync({ categoryId: envelope.category.id, year: month.year, month: month.month, ...values });
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === ApiErrorCode.CATEGORY_INACTIVE) {
        setFormError(INACTIVE_MESSAGE);
        return;
      }
      setFormError(applyServerErrors(err, form.setError, ['amount', 'splitPartner1Percent']));
    }
  });

  const onRemove = async () => {
    if (!budget) return;
    setFormError(null);
    try {
      await remove.mutateAsync(budget.id);
      onOpenChange(false);
    } catch (err) {
      setFormError(actionErrorMessage(err));
    }
  };

  const name = envelope?.category.name ?? '';

  return (
    <Sheet open={!!envelope} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="p-space-lg">
          <SheetTitle className="font-headline text-headline-sm">{budget ? `Edit budget: ${name}` : `Set budget: ${name}`}</SheetTitle>
          <SheetDescription>
            Monthly cap for {monthLabel(month)}. Changing a budget never changes transactions.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col gap-space-lg px-space-lg">
          <FormAlert message={formError} />
          <FormField label="Monthly budget (ARS)" error={errors.amount?.message} hint="For example 80.000 or 1.234,50">
            <Input inputMode="decimal" autoComplete="off" placeholder="0,00" {...form.register('amount')} />
          </FormField>

          <fieldset className="flex flex-col gap-space-sm">
            <legend className="mb-1 text-label-md text-on-surface">Split (planning only)</legend>
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-body-md text-on-surface">
              <input type="radio" value="DEFAULT" className="size-4 accent-secondary" {...form.register('splitMode')} />
              Household default ({splitLabel(defaultSplitPartner1Percent)})
            </label>
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-body-md text-on-surface">
              <input type="radio" value="CUSTOM" className="size-4 accent-secondary" {...form.register('splitMode')} />
              Custom split for this envelope
            </label>
            {splitMode === 'CUSTOM' && (
              <FormField
                label="Partner 1 share (%)"
                error={errors.splitPartner1Percent?.message}
                hint="Partner 2 gets the rest. Shown as a label only; it never moves money."
              >
                <Input inputMode="numeric" autoComplete="off" placeholder="50" {...form.register('splitPartner1Percent')} />
              </FormField>
            )}
          </fieldset>

          <SheetFooter className="mt-auto flex-col gap-space-sm px-0 pb-space-lg sm:flex-col">
            <Button type="submit" disabled={isSubmitting || upsert.isPending}>
              {upsert.isPending ? 'Saving…' : budget ? 'Save budget' : 'Set budget'}
            </Button>
            {budget &&
              (confirmRemove ? (
                <div role="group" aria-label="Confirm removal" className="flex flex-col gap-space-sm rounded-md border border-negative-border bg-negative-container p-space-sm">
                  <p className="text-body-sm text-on-surface">Remove the {monthLabel(month)} budget for {name}? Transactions stay as they are.</p>
                  <div className="flex gap-space-sm">
                    <Button type="button" variant="destructive" onClick={onRemove} disabled={remove.isPending}>
                      {remove.isPending ? 'Removing…' : 'Yes, remove'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setConfirmRemove(false)}>
                      Keep it
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="ghost" className="text-negative" onClick={() => setConfirmRemove(true)}>
                  Remove budget
                </Button>
              ))}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
