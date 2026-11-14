import { useMutation } from '@tanstack/react-query';
import { useApplyHousehold } from '@/features/households/application/use-apply-household';
import { acceptInvite } from '@/features/households/infrastructure/households-api';

export function useAcceptInvite() {
  const apply = useApplyHousehold();
  return useMutation({ mutationFn: acceptInvite, onSuccess: apply });
}
