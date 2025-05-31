
'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { UserNav } from '@/components/dashboard/user-nav';
import { AppLogo } from '@/components/icons/AppLogo';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { BottomNavigationBar } from '@/components/dashboard/bottom-nav';
import { BackButton } from '@/components/ui/back-button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.replace('/login');
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (isLoadingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // This typically won't be shown as the effect above will redirect.
    // It's a fallback.
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  const showBackButton = true; 
  
  return (
    <SidebarProvider defaultOpen>
      {/* Desktop Sidebar */}
      <Sidebar collapsible="icon" className="border-r hidden md:flex">
        <SidebarHeader className="p-4 flex items-center gap-2 justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <AppLogo className="h-8 w-8" />
            <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              Shivshakti Creation
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-2">
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
          <SidebarTrigger className="hidden md:flex group-data-[collapsible=icon]:hidden" />
          <div className="md:hidden w-8 h-8" /> {/* Placeholder for mobile menu alignment */}
          <div className="flex-grow" /> {/* Pushes UserNav to the right */}
          <div className="flex items-center gap-4">
            <UserNav />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto overflow-x-hidden pb-20 md:pb-6"> {/* Added overflow-x-hidden here */}
          {showBackButton && <BackButton className="mb-4" />}
          {children}
        </main>
      </SidebarInset>
      
      <BottomNavigationBar />
    </SidebarProvider>
  );
}
