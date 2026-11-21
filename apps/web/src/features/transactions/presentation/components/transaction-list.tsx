import type { Transaction } from '@tandem/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionRow } from '@/features/transactions/presentation/components/transaction-row';

interface TransactionListProps {
  transactions: Transaction[];
  onSelect?(transaction: Transaction): void;
  label: string;
}

export function TransactionList({ transactions, onSelect, label }: TransactionListProps) {
  return (
    <ul aria-label={label} className="divide-y divide-hairline-subtle overflow-hidden rounded-lg border border-hairline bg-surface-container-lowest shadow-level-1">
      {transactions.map((tx) => (
        <li key={tx.id}>
          <TransactionRow transaction={tx} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}

export function TransactionListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col divide-y divide-hairline-subtle rounded-lg border border-hairline bg-surface-container-lowest">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-space-md px-space-md py-space-sm">
          <Skeleton className="size-10 rounded-md" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}
