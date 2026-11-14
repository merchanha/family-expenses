import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/app/nav';
import { cn } from '@/lib/utils';

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1 px-space-md py-space-sm">
      {NAV_ITEMS.map(({ to, label, icon: Icon, badge }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between rounded-base px-space-md py-2.5 text-label-md transition-colors',
              isActive
                ? 'bg-surface-container font-semibold text-on-surface'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
            )
          }
        >
          <span className="flex items-center gap-space-md">
            <Icon className={cn('size-5', badge === 'AI' && 'text-secondary')} aria-hidden="true" />
            {label}
          </span>
          {badge && (
            <span className="rounded-full bg-secondary-fixed px-1.5 py-0.5 text-[10px] font-semibold text-on-secondary-fixed">
              {badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
