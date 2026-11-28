import type { PartnerSlot } from '@tandem/shared';
import { usePartnerFilter } from '@/features/households/application/use-partner-filter';
import { useCurrentHousehold } from '@/features/households/application/use-current-household';
import { memberLabel, PARTNER_SLOT_LABEL } from '@/features/households/domain/member-display';
import { cn } from '@/lib/utils';

const DOT: Record<PartnerSlot, string> = { PARTNER_1: 'bg-partner-1', PARTNER_2: 'bg-partner-2' };

/**
 * Header partner filter: All Shared | <Partner 1 name> | <Partner 2 name>.
 * Hidden until the household has both members (nothing to filter otherwise).
 */
export function PartnerFilter() {
  const { data } = useCurrentHousehold();
  const [active, setActive] = usePartnerFilter();
  if (!data || data.members.length < 2) return null;

  const options = [
    { slot: null, label: 'All Shared', short: 'All' },
    ...data.members.map((m) => {
      const label = memberLabel(m);
      return { slot: m.partnerSlot, label, short: label.slice(0, 2) };
    }),
  ];

  return (
    <div role="group" aria-label="Partner filter" className="flex items-center rounded-base bg-surface-container p-0.5">
      {options.map((o) => (
        <button
          key={o.slot ?? 'all'}
          type="button"
          aria-pressed={o.slot === active}
          title={o.slot ? `${o.label} (${PARTNER_SLOT_LABEL[o.slot]})` : undefined}
          onClick={() => setActive(o.slot)}
          className={cn(
            'flex min-h-8 items-center gap-1.5 rounded-[6px] pointer-coarse:min-h-10 px-space-sm py-1 text-label-sm sm:px-space-md',
            o.slot === active
              ? 'bg-surface-container-lowest text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface',
          )}
        >
          {o.slot && <span className={cn('size-1.5 rounded-full', DOT[o.slot])} aria-hidden="true" />}
          {/* Short labels below sm keep the header within a 360–390px viewport. */}
          <span className="sm:hidden" aria-hidden="true">{o.short}</span>
          <span className="max-w-32 truncate max-sm:sr-only">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
