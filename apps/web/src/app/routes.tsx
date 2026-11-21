import { Navigate, type RouteObject } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { PublicLayout } from '@/components/layout/public-layout';
import { CreateAccountPage, PublicOnly, RequireAuth, RequireNoHousehold, ResetPasswordPage, SignInPage } from '@/features/auth';
import { CategoriesPage } from '@/features/categories';
import { DashboardPage } from '@/features/dashboard';
import { JoinHouseholdPage, OnboardingPage, SettingsPage } from '@/features/households';
import { TransactionsPage } from '@/features/transactions';
import { NotFoundPage } from '@/pages/not-found-page';
import { PlaceholderPage } from '@/pages/placeholder-page';

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
          { path: '/categories', element: <CategoriesPage /> },
          { path: '/progress', element: <PlaceholderPage title="Financial Progress" milestone="P3" /> },
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
