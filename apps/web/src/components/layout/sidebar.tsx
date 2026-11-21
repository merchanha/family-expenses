import { Brand } from '@/components/layout/brand';
import { NewExpenseButton } from '@/components/layout/new-expense-button';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { HouseholdMembers } from '@/features/households';
import { useAuthenticatedSession } from '@/lib/auth/session-context';

/** Sidebar content shared by the desktop aside and the mobile Sheet. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="px-space-md pb-space-sm">
        <NewExpenseButton onOpen={onNavigate} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <HouseholdMembers onNavigate={onNavigate} />
    </>
  );
}

/** Brand + the Shared Space name from the session. */
export function SidebarBrand() {
  const { household } = useAuthenticatedSession();
  return <Brand subtitle={household?.name} />;
}

/** Desktop sidebar (≥ lg). On smaller screens the same content renders in a Sheet. */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-sidebar shadow-[0_1px_8px_rgba(0,0,0,0.04)] lg:flex">
      <div className="px-space-lg pt-space-lg pb-space-md">
        <SidebarBrand />
      </div>
      <SidebarContent />
    </aside>
  );
}
