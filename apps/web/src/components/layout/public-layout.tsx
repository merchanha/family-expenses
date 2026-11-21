import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Brand } from '@/components/layout/brand';
import { PageFallback } from '@/components/layout/page-fallback';

/** Bare layout for unauthenticated routes (sign-in, create account, reset password, onboarding). */
export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="flex h-16 items-center px-margin md:px-margin-md">
        <Brand />
      </header>
      <main className="flex flex-1 flex-col items-center px-margin py-space-xl md:py-margin-lg">
        <div className="w-full max-w-lg">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
