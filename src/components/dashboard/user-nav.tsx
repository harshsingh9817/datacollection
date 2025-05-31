
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';

export function UserNav() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [localAdminEmail, setLocalAdminEmail] = useState<string | null>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) { // If Firebase user logs out, check for local admin override
        setLocalAdminEmail(localStorage.getItem('userEmail'));
      } else {
        localStorage.removeItem('userEmail'); // Clear local admin if Firebase user exists
        setLocalAdminEmail(null);
      }
    });
    // Initial check for local admin on component mount
    if (!auth.currentUser) {
        setLocalAdminEmail(localStorage.getItem('userEmail'));
    }
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('userEmail'); // Ensure local admin override is cleared
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: 'Could not log you out. Please try again.',
      });
    }
  };
  
  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    const parts = email.split('@');
    return parts[0].substring(0, 2).toUpperCase();
  }

  const displayEmail = currentUser?.email || localAdminEmail;
  const displayName = currentUser?.displayName || (displayEmail === 'sunilkumarsingh817@gmail.com' ? 'Administrator' : 'User');


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={`https://placehold.co/100x100.png?text=${getInitials(displayEmail)}`} 
              alt={displayEmail || "User Avatar"} 
              data-ai-hint="avatar placeholder"
            />
            <AvatarFallback>{getInitials(displayEmail)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {displayName}
            </p>
            {displayEmail && (
              <p className="text-xs leading-none text-muted-foreground">
                {displayEmail}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
