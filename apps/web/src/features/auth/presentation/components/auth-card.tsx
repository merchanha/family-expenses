import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  eyebrow?: string;
  title: string;
  description: ReactNode;
  /** Show the Sign In | Create Account switch (design: segmented pill above the card). */
  showTabs?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

function AuthTabs() {
  const { pathname, search } = useLocation();
  const tabs = [
    { to: '/sign-in', label: 'Sign In' },
    { to: '/create-account', label: 'Create Account' },
  ];
  return (
    <nav aria-label="Account" className="mb-space-lg inline-flex self-start rounded-full bg-surface-container p-1">
      {tabs.map((t) => {
        const active = pathname === t.to;
        return (
          <Link
            key={t.to}
            to={`${t.to}${search}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-full px-space-md py-2 text-label-md transition-colors',
              active ? 'bg-surface-container-lowest text-on-surface shadow-level-1' : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Card shell for the public auth screens (design/*_tandem_finance). */
export function AuthCard({ eyebrow, title, description, showTabs, children, footer }: AuthCardProps) {
  return (
    <div className="flex flex-col">
      {showTabs && <AuthTabs />}
      <section className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-level-2">
        <div className="h-1 bg-linear-to-r from-partner-1 to-partner-2" aria-hidden="true" />
        <div className="flex flex-col gap-space-lg p-space-lg md:p-space-xl">
          <header className="flex flex-col gap-space-sm">
            {eyebrow && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-fixed px-space-sm py-1 text-label-sm text-on-primary-fixed uppercase">
                <span className="size-1.5 rounded-full bg-partner-1" aria-hidden="true" />
                {eyebrow}
              </span>
            )}
            <h1 className="font-headline text-headline-lg-mobile text-on-surface md:text-headline-lg">{title}</h1>
            <p className="text-body-md text-on-surface-variant">{description}</p>
          </header>
          {children}
          {footer && <div className="rounded-base bg-surface-container-low px-space-md py-space-sm text-center text-body-sm text-on-surface-variant">{footer}</div>}
        </div>
      </section>
    </div>
  );
}
