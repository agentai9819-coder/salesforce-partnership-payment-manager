'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  Briefcase,
  Scale,
  History,
  Settings,
  Database,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/billing', label: 'Billing', icon: Receipt },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/expenses', label: 'Expenses', icon: Briefcase },
  { href: '/settlements', label: 'Settlements', icon: Scale },
];

export function AppNavigation() {
  const pathname = usePathname();

  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 py-2 sm:px-6 scrollbar-none">
        <div className="flex space-x-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
