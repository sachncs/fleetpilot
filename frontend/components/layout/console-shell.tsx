'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { CommandPalette } from '@/components/layout/command-palette';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NAV_GROUPS, isActivePath } from '@/lib/nav';

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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="!h-4" />
          <span className="text-sm font-medium">{pageTitle(pathname)}</span>
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
