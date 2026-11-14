import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/lib/auth/session-context';
import { householdKeys } from '@/features/households/application/household-keys';
import { getCurrentHousehold } from '@/features/households/infrastructure/households-api';

/** GET /households/me — members, default split, pending invite. Only runs with a household. */
export function useCurrentHousehold() {
  const { state } = useSession();
  return useQuery({
    queryKey: householdKeys.current(),
    queryFn: getCurrentHousehold,
    enabled: state.status === 'authenticated' && state.household !== null,
  });
}
