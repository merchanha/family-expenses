import { lazy, type ComponentType } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { PublicLayout } from '@/components/layout/public-layout';
import { CreateAccountPage, PublicOnly, RequireAuth, RequireNoHousehold, ResetPasswordPage, SignInPage } from '@/features/auth';
import { NotFoundPage } from '@/pages/not-found-page';
import { PlaceholderPage } from '@/pages/placeholder-page';

/**
 * Route-level code splitting (FOR-106): each feature page is its own chunk. The app shell and
 * auth stay in the main chunk. Pages are imported from their module (not the feature index) so
 * the chunk boundary is the page, not everything the feature's public API re-exports.
 */
function lazyPage<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then((m) => ({ default: m[name] })));
}

const DashboardPage = lazyPage(() => import('@/features/dashboard/presentation/pages/dashboard-page'), 'DashboardPage');
const TransactionsPage = lazyPage(
  () => import('@/features/transactions/presentation/pages/transactions-page'),
  'TransactionsPage',
);
const CategoriesBudgetsPage = lazyPage(
  () => import('@/features/budgets/presentation/pages/categories-budgets-page'),
  'CategoriesBudgetsPage',
);
const FinancialProgressPage = lazyPage(
  () => import('@/features/financial-progress/presentation/pages/financial-progress-page'),
  'FinancialProgressPage',
);
const SettingsPage = lazyPage(() => import('@/features/households/presentation/pages/settings-page'), 'SettingsPage');
const OnboardingPage = lazyPage(() => import('@/features/households/presentation/pages/onboarding-page'), 'OnboardingPage');
const JoinHouseholdPage = lazyPage(
  () => import('@/features/households/presentation/pages/join-household-page'),
  'JoinHouseholdPage',
);

/** Route map — docs/DEVELOPMENT_ROADMAP.md §3 "Frontend route map". */
export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      {
        // Signed-in users are sent to their redirect target (or the dashboard / onboarding).
        element: <PublicOnly />,
        children: [
          { path: '/sign-in', element: <SignInPage /> },
          { path: '/create-account', element: <CreateAccountPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
        ],
      },
      {
        element: <RequireNoHousehold />,
        children: [{ path: '/onboarding', element: <OnboardingPage /> }],
      },
      // Invite link: works signed in or out, so it handles each session state itself.
      { path: '/join', element: <JoinHouseholdPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/transactions', element: <TransactionsPage /> },
          { path: '/categories', element: <CategoriesBudgetsPage /> },
          { path: '/progress', element: <FinancialProgressPage /> },
          { path: '/goals', element: <PlaceholderPage title="Savings Goals" milestone="P5" /> },
          { path: '/insights', element: <PlaceholderPage title="AI Insights" milestone="P6" /> },
          { path: '/notifications', element: <PlaceholderPage title="Notifications" milestone="P4" /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
