import {
  BarChart3,
  ClipboardList,
  CalendarDays,
  History,
  MapPinned,
  Play,
  Settings,
  Truck,
  Zap,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
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
    title: 'Workspace',
    items: [
      { href: '/overview', label: 'Today', icon: CalendarDays },
      { href: '/build', label: 'Route planner', icon: MapPinned },
      { href: '/optimize', label: 'Optimization', icon: Zap },
      { href: '/simulate', label: 'Route playback', icon: Play },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/orders', label: 'Deliveries', icon: ClipboardList },
      { href: '/fleet', label: 'Vehicles & depots', icon: Truck },
    ],
  },
  {
    title: 'Review',
    items: [
      { href: '/analytics', label: 'Performance', icon: BarChart3 },
      { href: '/history', label: 'Activity', icon: History },
    ],
  },
  {
    title: '',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
