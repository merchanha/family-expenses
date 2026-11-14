import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdKeys } from '@/features/households/application/household-keys';
import { revokeInvite } from '@/features/households/infrastructure/households-api';

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdKeys.current() }),
  });
}
