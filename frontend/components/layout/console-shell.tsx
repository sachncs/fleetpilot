'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { CommandPalette } from '@/components/layout/command-palette';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NAV_GROUPS, isActivePath } from '@/lib/nav';
import { BrandMark } from '@/components/brand-mark';

function pageTitle(pathname: string | null): string {
  if (!pathname) return 'FleetPilot';
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isActivePath(pathname, item.href)) return item.label;
    }
  }
  return 'FleetPilot';
}

export function ConsoleShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const [accessReady, setAccessReady] = React.useState(false);

  React.useEffect(() => {
    // The product console is deliberately open and has no login flow. The
    // public marker distinguishes first-party browser traffic from external
    // API clients, which continue to use revocable API keys.
    localStorage.setItem('fleetpilot_api_key', 'fp_public_console');
    setAccessReady(true);
  }, []);

  if (!accessReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <BrandMark className="size-8 rounded-[10px]" />
          Preparing FleetPilot…
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider className="bg-muted/30">
      <AppSidebar />
      <SidebarInset>
        <header className="matte-glass sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-x-0 border-t-0 px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="!h-4" />
          <span className="text-[13px] font-medium">{pageTitle(pathname)}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <CommandPalette />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
