import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth/session-context';
import { householdKeys } from '@/features/households/application/household-keys';
import { updateProfile } from '@/features/households/infrastructure/profile-api';

export function useUpdateProfile() {
  const { updateSession } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (current) => {
      updateSession(current);
      // Member names come from the user's name.
      return queryClient.invalidateQueries({ queryKey: householdKeys.current() });
    },
  });
}
