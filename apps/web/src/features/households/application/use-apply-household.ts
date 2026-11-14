import { useQueryClient } from '@tanstack/react-query';
import type { CurrentHouseholdResponse } from '@tandem/shared';
import { useSession } from '@/lib/auth/session-context';
import { householdKeys } from '@/features/households/application/household-keys';
import { toSessionHousehold } from '@/features/households/domain/member-display';

/** Store a fresh household response and keep the session's household summary in sync. */
export function useApplyHousehold() {
  const queryClient = useQueryClient();
  const { state, updateSession } = useSession();
  return (data: CurrentHouseholdResponse) => {
    queryClient.setQueryData(householdKeys.current(), data);
    if (state.status === 'authenticated') {
      updateSession({ user: state.user, household: toSessionHousehold(data) });
    }
  };
}
