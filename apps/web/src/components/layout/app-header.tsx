import { useState } from 'react';
import { Menu } from 'lucide-react';
import { SidebarBrand, SidebarContent } from '@/components/layout/sidebar';
import { PartnerFilter, SplitIndicator, useCurrentHousehold } from '@/features/households';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

function HeaderSplitIndicator() {
  const { data } = useCurrentHousehold();
  if (!data || data.members.length < 2) return null;
  return <SplitIndicator partner1Percent={data.household.defaultSplitPartner1Percent} className="hidden md:inline-flex" />;
}

export function AppHeader({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-space-md bg-surface/80 px-margin shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl md:px-margin-md">
      <div className="flex min-w-0 items-center gap-space-sm">
        <Sheet open={open} onOpenChange={setOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <SheetContent side="left" className="flex w-72 flex-col gap-0 bg-sidebar p-0">
            <SheetHeader className="px-space-lg pt-space-lg pb-space-md">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">Tandem Finance main navigation</SheetDescription>
              <SidebarBrand />
            </SheetHeader>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <h1 className="truncate font-headline text-headline-sm text-on-surface md:text-headline-md">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-space-sm">
        <PartnerFilter />
        <HeaderSplitIndicator />
      </div>
    </header>
  );
}
