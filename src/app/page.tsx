
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        // Check if it's the special local admin case
        const localAdminEmail = localStorage.getItem('userEmail');
        if (localAdminEmail === 'sunilkumarsingh817@gmail.com') {
          router.replace('/dashboard'); // Allow local admin to proceed
        } else {
          router.replace('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-foreground">Loading Shivshakti Creation...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <p className="text-lg text-foreground">Redirecting...</p>
    </div>
  );
}
