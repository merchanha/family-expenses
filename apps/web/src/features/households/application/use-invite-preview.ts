import { useQuery } from '@tanstack/react-query';
import { householdKeys } from '@/features/households/application/household-keys';
import { getInvitePreview } from '@/features/households/infrastructure/households-api';

/** GET /invites/:token (public) — who invited you and to which Shared Space. */
export function useInvitePreview(token: string | null) {
  return useQuery({
    queryKey: householdKeys.invitePreview(token ?? ''),
    queryFn: () => getInvitePreview(token!),
    enabled: !!token,
  });
}
