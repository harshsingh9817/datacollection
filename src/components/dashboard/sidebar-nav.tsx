
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building, ShieldCheck, HomeIcon } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useAppState } from '@/context/AppStateContext';
import { useEffect } from 'react';

const baseNavItemsForSidebar = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/dashboard/schools', label: 'Schools', icon: Building },
];

const adminNavItemForSidebar = { href: '/dashboard/admin', label: 'Admin Panel', icon: ShieldCheck };

export function SidebarNav() {
  const pathname = usePathname();
  const { isAdmin, currentUser } = useAppState();

  useEffect(() => {
    console.log(
      `%cSidebarNav (Desktop): isAdmin state: ${isAdmin}, Current User: ${currentUser?.email}`,
      "color: orange; font-weight: bold;"
    );
  }, [isAdmin, currentUser]);

  // For desktop sidebar, admin tab should be first if admin.
  const effectiveNavItemsForSidebar = isAdmin ? 
    [
      adminNavItemForSidebar, 
      ...baseNavItemsForSidebar
    ] 
    : 
    baseNavItemsForSidebar;


  return (
    <SidebarMenu>
      {effectiveNavItemsForSidebar.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} legacyBehavior passHref>
            <SidebarMenuButton
              asChild
              className={cn(
                'w-full justify-start',
                (pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard' && item.href !== '/'))
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                  : 'hover:bg-muted/50'
              )}
              isActive={(pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard' && item.href !== '/'))}
              tooltip={item.label}
            >
              <a>
                <item.icon className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
