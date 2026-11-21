import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Partner changes show up when you come back to the tab; staleTime caps how often.
        // Only stale data queries refetch; /auth/refresh isn't a query. It runs only via the normal
        // 401 path in apiRequest (expired access token), deduped by refreshSession().
        refetchOnWindowFocus: true,
        // Don't retry client errors (4xx); retry network/5xx up to 2 times.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });
}
