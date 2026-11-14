import { useMutation } from '@tanstack/react-query';
import { useApplyHousehold } from '@/features/households/application/use-apply-household';
import { createHousehold } from '@/features/households/infrastructure/households-api';

export function useCreateHousehold() {
  const apply = useApplyHousehold();
  return useMutation({ mutationFn: createHousehold, onSuccess: apply });
}
