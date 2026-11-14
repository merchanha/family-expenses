import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentHousehold } from '@/features/households/application/use-current-household';
import { memberLabel, PARTNER_SLOT_LABEL } from '@/features/households/domain/member-display';
import { PartnerAvatar } from '@/features/households/presentation/components/partner-avatar';
import { SplitIndicator } from '@/features/households/presentation/components/split-indicator';

/** Sidebar footer: the Shared Space members with their partner colors + default split. */
export function HouseholdMembers({ onNavigate }: { onNavigate?: () => void }) {
  const { data, isPending, isError } = useCurrentHousehold();

  if (isPending) {
    return (
      <div className="flex flex-col gap-space-sm px-space-lg py-space-md" aria-hidden="true">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  if (isError) return null; // Chrome only; the page itself surfaces API errors.

  const { members, household, invites, me } = data;
  return (
    <section aria-label="Household members" className="flex flex-col gap-space-sm border-t border-hairline px-space-lg py-space-md">
      <div className="flex items-center justify-between">
        <span className="text-label-sm text-on-surface-variant uppercase">Shared Space</span>
        {members.length === 2 && <SplitIndicator partner1Percent={household.defaultSplitPartner1Percent} />}
      </div>
      <ul className="flex flex-col gap-space-sm">
        {members.map((m) => (
          <li key={m.id} className="flex min-w-0 items-center gap-space-sm">
            <PartnerAvatar member={m} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-label-md text-on-surface">
                {memberLabel(m)}
                {m.userId === me.userId && <span className="text-on-surface-variant"> (you)</span>}
              </span>
              <span className="text-label-sm text-on-surface-variant">{PARTNER_SLOT_LABEL[m.partnerSlot]}</span>
            </div>
          </li>
        ))}
      </ul>
      {members.length < 2 && (
        <Link
          to="/settings"
          onClick={onNavigate}
          className="flex items-center gap-space-sm rounded-base py-1 text-label-md text-secondary hover:underline"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          {invites.length > 0 ? `Invite sent to ${invites[0]!.email}` : 'Invite your partner'}
        </Link>
      )}
    </section>
  );
}
