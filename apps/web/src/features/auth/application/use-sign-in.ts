import { useMutation } from '@tanstack/react-query';
import { useSession } from '@/lib/auth/session-context';
import { login } from '@/features/auth/infrastructure/auth-api';

/** POST /auth/login; on success the session starts and PublicOnly redirects. */
export function useSignIn() {
  const { startSession } = useSession();
  return useMutation({ mutationFn: login, onSuccess: startSession });
}
