import { financialProgressResponseSchema, type FinancialProgressResponse, type PartnerSlot, type ProgressWindow } from '@tandem/shared';
import { api } from '@/lib/api';

export interface FinancialProgressFilters {
  year: number;
  month: number;
  window: ProgressWindow;
  partner: PartnerSlot | null;
}

/** GET /financial-progress/comparison — equivalent-period comparison computed by the API (decision #16). */
export function getFinancialProgress(filters: FinancialProgressFilters): Promise<FinancialProgressResponse> {
  return api.get('/financial-progress/comparison', { schema: financialProgressResponseSchema, query: { ...filters } });
}
