import { useMutation } from '@tanstack/react-query';
import { useApplyHousehold } from '@/features/households/application/use-apply-household';
import { updateHousehold } from '@/features/households/infrastructure/households-api';

export function useUpdateHousehold() {
  const apply = useApplyHousehold();
  return useMutation({ mutationFn: updateHousehold, onSuccess: apply });
}
