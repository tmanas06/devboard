'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  Building2,
  User,
  Activity,
  BarChart3,
  Terminal,
} from 'lucide-react';
import { OrgSwitcher } from '@/components/org-switcher';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  // { name: 'Time Entries', href: '/dashboard/time-entries', icon: Clock },
  { name: 'Activity', href: '/dashboard/activity', icon: Activity },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Organizations', href: '/dashboard/organizations', icon: Building2 },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6 glow-primary">
        <Terminal className="h-6 w-6 text-sidebar-primary" />
        <span className="text-xl font-bold tracking-widest text-sidebar-foreground">DEVBOARD</span>
      </div>

      {/* Org Switcher */}
      <div className="px-3 pt-3">
        <OrgSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-mono tracking-wider transition-colors',
                isActive
                  ? 'bg-sidebar-primary/10 text-sidebar-primary border border-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-foreground/10'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
