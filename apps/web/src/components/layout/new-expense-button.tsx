import { CirclePlus } from 'lucide-react';
import { useTransactionDialog } from '@/features/transactions';

function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

/** Sidebar primary CTA (design/main_dashboard): opens the Add Transaction modal; ⌘K / Ctrl+K does the same. */
export function NewExpenseButton({ onOpen }: { onOpen?: () => void }) {
  const { openNew } = useTransactionDialog();
  const shortcut = isApplePlatform() ? '⌘K' : 'Ctrl K';
  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        openNew();
      }}
      aria-keyshortcuts="Meta+K Control+K"
      className="flex min-h-11 w-full items-center justify-between rounded-base bg-primary px-space-md text-label-md text-on-primary shadow-level-2 transition-colors hover:bg-primary-container focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex items-center gap-space-sm">
        <CirclePlus className="size-5" aria-hidden="true" />
        New Expense
      </span>
      <kbd className="rounded-sm bg-on-primary/15 px-1.5 py-0.5 font-body text-label-sm text-on-primary/80" aria-hidden="true">
        {shortcut}
      </kbd>
    </button>
  );
}
