import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdKeys } from '@/features/households/application/household-keys';
import { updateMyMember } from '@/features/households/infrastructure/households-api';

export function useUpdateMyMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyMember,
    onSuccess: (data) => queryClient.setQueryData(householdKeys.current(), data),
  });
}
