import type { HouseholdMember } from '@tandem/shared';
import { memberInitials } from '@/features/households/domain/member-display';
import { cn } from '@/lib/utils';

const SLOT_CLASSES = {
  PARTNER_1: 'bg-partner-1-container text-on-partner-1-container ring-partner-1-border',
  PARTNER_2: 'bg-partner-2-container text-on-partner-2-container ring-partner-2-border',
} as const;

/** Initials avatar in the member's partner attribution color (DESIGN.md "Dual Partner Attribution"). */
export function PartnerAvatar({ member, className }: { member: HouseholdMember; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full text-label-sm font-semibold ring-1',
        SLOT_CLASSES[member.partnerSlot],
        className,
      )}
    >
      {memberInitials(member)}
    </span>
  );
}
