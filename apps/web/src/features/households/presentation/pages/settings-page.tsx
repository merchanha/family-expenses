import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/lib/auth/session-context';
import { NETWORK_ERROR_MESSAGE } from '@/lib/form-errors';
import { ApiError } from '@/lib/api';
import { useCurrentHousehold } from '@/features/households/application/use-current-household';
import { HouseholdSection } from '@/features/households/presentation/components/settings/household-section';
import { MembersSection } from '@/features/households/presentation/components/settings/members-section';
import { ProfileSection } from '@/features/households/presentation/components/settings/profile-section';
import { SettingsSection } from '@/features/households/presentation/components/settings/settings-section';

export function SettingsPage() {
  const { signOut } = useSession();
  const { data, isPending, isError, error, refetch } = useCurrentHousehold();
  const me = data?.members.find((m) => m.userId === data.me.userId);

  return (
    <div className="flex max-w-3xl flex-col gap-space-lg">
      {isPending && (
        <div className="flex flex-col gap-space-lg" aria-label="Loading settings">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}
      {isError && (
        <div role="alert" className="flex items-center justify-between gap-space-md rounded-base border border-negative-border bg-negative-container p-space-md text-body-sm text-danger-text">
          {error instanceof ApiError && error.status === 0 ? NETWORK_ERROR_MESSAGE : "Couldn't load your Shared Space."}
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}
      {data && (
        <>
          <ProfileSection me={me} />
          <MembersSection data={data} />
          <HouseholdSection data={data} />
        </>
      )}
      <SettingsSection title="Security" description="Signing out ends this browser's session.">
        <div>
          <Button variant="secondary" onClick={() => void signOut()}>
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
