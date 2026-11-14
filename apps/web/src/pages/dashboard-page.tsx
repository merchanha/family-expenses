import { ApiStatus } from '@/components/api-status';
import { PlaceholderPage } from '@/pages/placeholder-page';

export function DashboardPage() {
  return (
    <PlaceholderPage title="Dashboard" milestone="P3 — Budgets, Dashboard Charts & Financial Progress">
      <div className="flex flex-col gap-1">
        <h2 className="text-display-lg-mobile md:text-display-lg text-on-surface">Welcome back</h2>
        <p className="text-body-lg text-on-surface-variant">Your shared household overview will live here.</p>
      </div>
      <ApiStatus />
    </PlaceholderPage>
  );
}
