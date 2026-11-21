import { Outlet, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '@/app/nav';
import { AppHeader } from '@/components/layout/app-header';
import { FlashNotice } from '@/components/layout/flash-notice';
import { Sidebar } from '@/components/layout/sidebar';
import { TransactionDialogProvider } from '@/features/transactions';

/**
 * Authenticated layout: sidebar + header chrome + routed page (guarded by RequireAuth in routes).
 * Hosts the one Add/Edit Transaction modal (sidebar CTA, pages, ⌘K / Ctrl+K).
 */
export function AppLayout() {
  const { pathname } = useLocation();
  const current = NAV_ITEMS.find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
  return (
    <TransactionDialogProvider>
      <div className="min-h-dvh bg-surface">
        <Sidebar />
        <div className="flex min-h-dvh flex-col lg:pl-72">
          <AppHeader title={current?.title ?? 'Tandem Finance'} monthScoped={current?.monthScoped ?? false} />
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-margin py-space-lg md:px-margin-md lg:px-margin-lg">
            <FlashNotice />
            <Outlet />
          </main>
        </div>
      </div>
    </TransactionDialogProvider>
  );
}
