import type { TransactionType } from '@tandem/shared';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

interface MoneyAmountProps {
  /** Decimal string from the API ("1234.50"). Never a number. */
  amount: string;
  /** Income shows "+" in text-positive, expense "−" in text-negative; omit for a neutral total. */
  type?: TransactionType;
  currency?: string;
  className?: string;
}

const SIGN: Record<TransactionType, string> = { INCOME: '+', EXPENSE: '−' };
const TONE: Record<TransactionType, string> = { INCOME: 'text-positive', EXPENSE: 'text-negative' };

/**
 * One way to show money: ARS / es-AR, tabular figures, and for transactions a
 * sign plus color (color is never the only signal — apps/web/CLAUDE.md §13/§17).
 * Display only: no arithmetic here.
 */
export function MoneyAmount({ amount, type, currency, className }: MoneyAmountProps) {
  const formatted = formatMoney(amount, currency ? { currency } : undefined);
  return (
    <span className={cn('tabular whitespace-nowrap', type && TONE[type], className)}>
      {type ? `${SIGN[type]}${formatted}` : formatted}
    </span>
  );
}
