import {
  ClipboardList,
  Gauge,
  LayoutDashboard,
  MapPinned,
  Play,
  Settings,
  Truck,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Single source of truth for console navigation.
 * Groups grow as sections land: Operations, Resources, Insights, System.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Operations',
    items: [
      { href: '/overview', label: 'Overview', icon: Gauge },
      { href: '/build', label: 'Planning', icon: MapPinned },
      { href: '/optimize', label: 'Optimize', icon: Zap },
      { href: '/simulate', label: 'Simulation', icon: Play },
    ],
  },
  {
    title: 'Resources',
    items: [
      { href: '/fleet', label: 'Fleet', icon: Truck },
      { href: '/orders', label: 'Orders', icon: ClipboardList },
    ],
  },
  {
    title: 'Insights',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'System',
    items: [{ href: '/settings', label: 'Settings', icon: Settings }],
  },
];

export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
