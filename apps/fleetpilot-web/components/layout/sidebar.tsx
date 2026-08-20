'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MapPin, Play, Settings, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/build', label: 'Build', icon: MapPin },
  { href: '/simulate', label: 'Simulate', icon: Play },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar(): React.ReactElement {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-background">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Truck className="h-5 w-5 text-primary" />
        <span className="text-lg font-bold tracking-tight">FleetPilot</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        FleetPilot v0.1.0
      </div>
    </aside>
  );
}
