import { Pencil, Plus } from 'lucide-react';
import type { Envelope } from '@tandem/shared';
import { MoneyAmount } from '@/components/money-amount';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMoney, formatPercent } from '@/lib/money';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/features/categories';
import { absAmount, envelopeSplitLabel, isNegativeAmount } from '@/features/budgets/domain/budget-display';
import { budgetStatusDisplay } from '@/features/budgets/domain/budget-status';
import { BudgetStatusBadge } from '@/features/budgets/presentation/components/budget-status-badge';
import { UtilizationBar } from '@/features/budgets/presentation/components/utilization-bar';

export interface PartnerNames {
  partner1: string;
  partner2: string;
}

interface EnvelopeCardProps {
  envelope: Envelope;
  currency: string;
  defaultSplitPartner1Percent: number;
  names: PartnerNames;
  onEdit(envelope: Envelope): void;
}

/** One envelope (design/categories_monthly_budgets). Every figure is the API's. */
export function EnvelopeCard({ envelope, currency, defaultSplitPartner1Percent, names, onEdit }: EnvelopeCardProps) {
  const { category, budget, status } = envelope;
  const display = budgetStatusDisplay(status);
  const over = envelope.remaining !== null && isNegativeAmount(envelope.remaining);
  const money = (amount: string) => formatMoney(amount, { currency });

  return (
    <article
      aria-label={category.name}
      className={cn(
        'flex min-w-0 flex-col gap-space-md rounded-lg border border-hairline bg-surface-container-lowest p-space-lg shadow-level-1',
        status === 'EXCEEDED' && 'border-t-4 border-t-negative',
      )}
    >
      <header className="flex items-start gap-space-sm">
        <CategoryIcon icon={category.icon} color={category.color} className={category.isActive ? undefined : 'opacity-50'} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h4 className="truncate text-label-md text-on-surface">{category.name}</h4>
          <span className="flex flex-wrap items-center gap-1">
            <BudgetStatusBadge status={status} />
            {!category.isActive && <Badge variant="outline">Inactive</Badge>}
          </span>
        </div>
        {budget && (
          <Button variant="ghost" size="icon" aria-label={`Edit budget for ${category.name}`} onClick={() => onEdit(envelope)}>
            <Pencil />
          </Button>
        )}
      </header>

      <div className="flex flex-wrap items-end justify-between gap-x-space-md gap-y-1">
        <p className="flex items-baseline gap-1.5">
          <MoneyAmount amount={envelope.spent} currency={currency} className={cn('font-headline text-headline-md', status === 'EXCEEDED' && 'text-negative')} />
          <span className="text-body-sm text-on-surface-variant">spent</span>
        </p>
        {budget && envelope.remaining !== null && (
          <p className="flex flex-col items-end text-body-sm">
            <span className={cn('tabular', over ? 'text-danger-text' : display.text)}>
              {over ? `${money(absAmount(envelope.remaining))} over` : `${money(envelope.remaining)} left`}
            </span>
            <span className="tabular text-on-surface-variant">cap {money(budget.amount)}</span>
          </p>
        )}
      </div>

      {budget ? (
        <div className="flex flex-col gap-1.5">
          <UtilizationBar utilization={envelope.utilization} status={status} />
          <span className="tabular text-label-sm text-on-surface-variant">
            {envelope.utilization === null ? 'Utilization not available' : `${formatPercent(envelope.utilization)} utilized`}
          </span>
        </div>
      ) : (
        <Button variant="secondary" size="sm" className="self-start" onClick={() => onEdit(envelope)} aria-label={`Set budget for ${category.name}`}>
          <Plus aria-hidden="true" />
          Set budget
        </Button>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-x-space-md gap-y-1 rounded-md bg-surface-container-low px-space-sm py-space-xs text-label-sm text-on-surface-variant">
        <span className="sr-only">Paid by:</span>
        <PaidBy dot="bg-partner-1" name={names.partner1} amount={money(envelope.paidBy.partner1)} />
        <PaidBy dot="bg-partner-2" name={names.partner2} amount={money(envelope.paidBy.partner2)} />
        <PaidBy dot="bg-on-surface-variant" name="Shared" amount={money(envelope.paidBy.shared)} />
        {budget && (
          <span className="ml-auto rounded-full bg-surface-container px-2 py-0.5 tabular">
            <span className="sr-only">Split: </span>
            {envelopeSplitLabel(budget.splitPartner1Percent, defaultSplitPartner1Percent)}
          </span>
        )}
      </footer>
    </article>
  );
}

function PaidBy({ dot, name, amount }: { dot: string; name: string; amount: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className={cn('size-1.5 shrink-0 rounded-full', dot)} aria-hidden="true" />
      <span className="truncate">{name}:</span>
      <span className="tabular text-on-surface">{amount}</span>
    </span>
  );
}
