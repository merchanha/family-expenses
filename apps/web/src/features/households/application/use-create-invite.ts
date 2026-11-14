import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdKeys } from '@/features/households/application/household-keys';
import { createInvite } from '@/features/households/infrastructure/households-api';

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdKeys.current() }),
  });
}
