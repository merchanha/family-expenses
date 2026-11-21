import { periodSummaryResponseSchema, type PartnerSlot, type PeriodSummaryResponse } from '@tandem/shared';
import { api } from '@/lib/api';

export interface PeriodSummaryFilters {
  year: number;
  month: number;
  partner: PartnerSlot | null;
}

/** GET /summaries/period — every figure is computed by the API (CLAUDE.md §6). */
export function getPeriodSummary(filters: PeriodSummaryFilters): Promise<PeriodSummaryResponse> {
  return api.get('/summaries/period', { schema: periodSummaryResponseSchema, query: { ...filters } });
}
