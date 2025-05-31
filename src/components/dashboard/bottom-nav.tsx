
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building, ShieldCheck, HomeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/context/AppStateContext';

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon }, // Changed to HomeIcon for common bottom nav feel
  { href: '/dashboard/schools', label: 'Schools', icon: Building },
];

const adminNavItem = { href: '/dashboard/admin', label: 'Admin', icon: ShieldCheck };

export function BottomNavigationBar() {
  const pathname = usePathname();
  const { isAdmin } = useAppState();

  // Ensure unique keys if hrefs could be duplicated, though unlikely here
  // Order for bottom nav: Dashboard, Schools, Admin (if admin)
  const effectiveNavItems = isAdmin ? 
    [
      { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
      { href: '/dashboard/schools', label: 'Schools', icon: Building },
      adminNavItem
    ] 
    : 
    [
      { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
      { href: '/dashboard/schools', label: 'Schools', icon: Building },
    ];


  if (effectiveNavItems.length === 0) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className={cn(
          "grid h-full max-w-lg mx-auto font-medium",
          effectiveNavItems.length === 2 ? "grid-cols-2" : "grid-cols-3"
        )}>
        {effectiveNavItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard' && item.href !== '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-muted group',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5 mb-1 transition-colors group-hover:text-primary', isActive ? 'text-primary' : '')} />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
