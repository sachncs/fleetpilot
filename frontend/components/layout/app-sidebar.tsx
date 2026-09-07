'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Truck } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

import { NAV_GROUPS, isActivePath } from '@/lib/nav';
import { usePolling } from '@/hooks/use-polling';

/** Active solver runs for the Optimize nav badge (30s poll). */
function useActiveRunCount(): number | null {
  const fetcher = React.useCallback(async () => {
    const apiKey = localStorage.getItem('fleetpilot_api_key');
    if (!apiKey) return null;
    const res = await fetch('/api/jobs?status=running&limit=100', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { jobs: unknown[] };
    return data.jobs.length;
  }, []);
  const { data } = usePolling(fetcher, { intervalMs: 30_000 });
  return data;
}

export function AppSidebar(): React.JSX.Element {
  const pathname = usePathname();
  const activeRuns = useActiveRunCount();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Truck className="h-5 w-5 text-primary" />
          <span className="text-base font-bold tracking-tight">FleetPilot</span>
          <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Console
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActivePath(pathname, item.href)} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.href === '/optimize' && activeRuns !== null && activeRuns > 0 && (
                      <SidebarMenuAction className="pointer-events-none right-1 top-1/2 -translate-y-1/2 bg-primary/10 text-primary text-[10px] font-semibold tabular-nums">
                        {activeRuns}
                      </SidebarMenuAction>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1 text-xs text-muted-foreground">FleetPilot Console</div>
      </SidebarFooter>
    </Sidebar>
  );
}
