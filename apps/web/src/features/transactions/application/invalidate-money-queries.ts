import type { QueryClient } from '@tanstack/react-query';

/**
 * A transaction change moves every server-computed aggregate (apps/web/CLAUDE.md §6):
 * lists, dashboard summaries, budgets, Financial Progress, alerts, and category usage counts.
 * Root keys are listed by name so features that don't exist yet are covered too.
 */
const AFFECTED_ROOTS = ['transactions', 'summaries', 'budgets', 'financial-progress', 'notifications', 'categories'] as const;

export function invalidateMoneyQueries(queryClient: QueryClient): Promise<void> {
  return Promise.all(AFFECTED_ROOTS.map((root) => queryClient.invalidateQueries({ queryKey: [root] }))).then(() => undefined);
}
