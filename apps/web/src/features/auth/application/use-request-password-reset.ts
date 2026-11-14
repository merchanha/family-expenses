import { useMutation } from '@tanstack/react-query';
import { requestPasswordReset } from '@/features/auth/infrastructure/auth-api';

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}
