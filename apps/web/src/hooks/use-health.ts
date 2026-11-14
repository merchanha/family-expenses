import { useQuery } from '@tanstack/react-query';
import { healthResponseSchema, type HealthResponse } from '@tandem/shared';
import { api, ApiError } from '@/lib/api';

export const healthQueryKey = ['health'] as const;

/**
 * GET /api/health — contract `{ status, db: "up" | "down", timestamp }`.
 * The API answers 503 (same body shape) when the DB is down; we surface that
 * as data (db: "down") instead of an error so the UI can show "degraded".
 */
export async function fetchHealth(): Promise<HealthResponse> {
  try {
    return await api.get<HealthResponse>('/health', { schema: healthResponseSchema, anonymous: true });
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) {
      const parsed = healthResponseSchema.safeParse(err.body);
      if (parsed.success) return parsed.data;
    }
    throw err;
  }
}

export function useHealth() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: fetchHealth,
    refetchInterval: 30_000,
    retry: 1,
  });
}
