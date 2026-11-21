import {
  dashboardChartsResponseSchema,
  periodSummaryResponseSchema,
  type DashboardChartsResponse,
  type PartnerSlot,
  type PeriodSummaryResponse,
} from '@tandem/shared';
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

/** GET /summaries/charts — cash-flow trajectory + spending by category, grouped by the API. */
export function getDashboardCharts(filters: PeriodSummaryFilters): Promise<DashboardChartsResponse> {
  return api.get('/summaries/charts', { schema: dashboardChartsResponseSchema, query: { ...filters } });
}
