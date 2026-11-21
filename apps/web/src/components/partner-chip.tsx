import type { PartnerSlot } from '@tandem/shared';
import { cn } from '@/lib/utils';

const SLOT_CLASSES: Record<PartnerSlot, { chip: string; dot: string }> = {
  PARTNER_1: { chip: 'bg-partner-1-container text-on-partner-1-container border-partner-1-border', dot: 'bg-partner-1' },
  PARTNER_2: { chip: 'bg-partner-2-container text-on-partner-2-container border-partner-2-border', dot: 'bg-partner-2' },
};

interface PartnerChipProps {
  /** The attributed person, or null for "Shared" (not attributed to one partner). */
  person: { name: string; partnerSlot: PartnerSlot | null } | null;
  /** Prefix for screen readers, e.g. "Paid by" / "Created by". */
  role?: string;
  className?: string;
}

/**
 * Partner attribution chip (DESIGN.md "Dual Partner Attribution"): Partner 1 /
 * Partner 2 in their tokens, or a neutral "Shared". The name is always shown,
 * so color is never the only signal.
 */
export function PartnerChip({ person, role, className }: PartnerChipProps) {
  const slot = person?.partnerSlot ?? null;
  const styles = slot ? SLOT_CLASSES[slot] : null;
  const label = person?.name ?? 'Shared';
  return (
    <span
      className={cn(
        'inline-flex max-w-40 items-center gap-1 rounded-full border px-2 py-0.5 text-label-sm',
        styles ? styles.chip : 'border-outline-variant bg-surface-container-low text-on-surface-variant',
        className,
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', styles ? styles.dot : 'bg-on-surface-variant')} aria-hidden="true" />
      {role && <span className="sr-only">{role}: </span>}
      <span className="truncate">{label}</span>
    </span>
  );
}
