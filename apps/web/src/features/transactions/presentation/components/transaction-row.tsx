import type { Transaction } from '@tandem/shared';
import { MoneyAmount } from '@/components/money-amount';
import { PartnerChip } from '@/components/partner-chip';
import { formatCalendarDate } from '@/lib/month';
import { CategoryIcon } from '@/features/categories';
import { TYPE_LABEL } from '@/features/transactions/domain/transaction-display';

interface TransactionRowProps {
  transaction: Transaction;
  onSelect?(transaction: Transaction): void;
}

/** One transaction: category tile, description, paid-by chip, category · date · created by, signed amount. */
export function TransactionRow({ transaction: tx, onSelect }: TransactionRowProps) {
  const content = (
    <>
      <CategoryIcon icon={tx.category.icon} color={tx.category.color} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-label-md text-on-surface">{tx.description}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-space-sm gap-y-1 text-body-sm text-on-surface-variant">
          <PartnerChip person={tx.paidBy} role="Paid by" />
          <span className="truncate">{tx.category.name}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular">{formatCalendarDate(tx.transactionDate)}</span>
          <span className="hidden truncate md:inline">· Added by {tx.createdBy.name}</span>
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="sr-only">{TYPE_LABEL[tx.type]}:</span>
        <MoneyAmount amount={tx.amount} type={tx.type} currency={tx.currency} className="font-headline text-headline-sm" />
      </div>
    </>
  );

  const className = 'flex w-full items-center gap-space-md px-space-md py-space-sm text-left';
  if (!onSelect) return <div className={className}>{content}</div>;
  return (
    <button
      type="button"
      onClick={() => onSelect(tx)}
      aria-label={`Edit ${tx.description}`}
      className={`${className} transition-colors hover:bg-surface-container-low focus-visible:bg-surface-container-low focus-visible:outline-none`}
    >
      {content}
    </button>
  );
}
