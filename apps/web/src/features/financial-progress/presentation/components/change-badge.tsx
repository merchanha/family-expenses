import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatPercent } from '@/lib/money';
import { cn } from '@/lib/utils';
import { changeTone, directionOf, unsigned, type Direction } from '@/features/financial-progress/domain/progress-display';

const SIGN: Record<Direction, string> = { up: '+', down: '−', flat: '' };
const ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus };
const TONE = {
  positive: 'bg-positive-container text-positive',
  negative: 'bg-negative-container text-negative',
  neutral: 'bg-surface-container text-on-surface-variant',
};

/** "+18,10 %" from an API percent string ("18.10"); null → "Not available". */
export function signedPercent(value: string): string {
  return `${SIGN[directionOf(value)]}${formatPercent(unsigned(value))}`;
}

/** "+2,30 pp" — percentage-point delta for the savings rate. */
export function signedPoints(value: string): string {
  return `${SIGN[directionOf(value)]}${formatPercent(unsigned(value)).replace(/ %$/, ' pp')}`;
}

interface ChangeBadgeProps {
  /** API signed value that sets the direction (percent, points or amount). */
  value: string | null;
  /** Text to show (already formatted). */
  label: string;
  /** More is better (income, buffer, savings rate) or worse (spending). */
  higherIsBetter: boolean;
  className?: string;
}

/** Change pill: arrow + signed text + color — the direction never relies on color alone. */
export function ChangeBadge({ value, label, higherIsBetter, className }: ChangeBadgeProps) {
  if (value === null) {
    return <span className={cn('rounded-full px-2 py-0.5 text-label-sm', TONE.neutral, className)}>{label}</span>;
  }
  const direction = directionOf(value);
  const Icon = ICON[direction];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-label-sm tabular whitespace-nowrap',
        TONE[changeTone(direction, higherIsBetter)],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {direction === 'up' ? <span className="sr-only">Up </span> : direction === 'down' ? <span className="sr-only">Down </span> : null}
      <span>{label}</span>
    </span>
  );
}
