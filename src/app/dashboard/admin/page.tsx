
'use client';

import React from 'react';
import Link from 'next/link';
import { useAppState } from '@/context/AppStateContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Users, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const { userProfiles, isLoading, isAdmin, currentUser } = useAppState();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !isAdmin) {
      console.log("AdminUsersPage: Not admin or loading finished, redirecting to /dashboard.");
      router.replace('/dashboard');
    }
  }, [isLoading, isAdmin, router]);

  React.useEffect(() => {
    console.log("AdminUsersPage: userProfiles state:", userProfiles);
  }, [userProfiles]);


  if (isLoading || !currentUser) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading admin panel...</p>
      </div>
    );
  }

  if (!isAdmin) {
     return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <p className="text-lg text-destructive">Access Denied. You are not authorized to view this page. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <Users className="mr-3 h-7 w-7 text-primary" />
            User Management
          </CardTitle>
          <CardDescription className="break-words">
            View and manage user data. ({userProfiles.length} users found)
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {userProfiles.length > 0 ? (
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 px-2 py-2">Name</TableHead>
                  <TableHead className="px-4 py-2">Email</TableHead>
                  <TableHead className="hidden md:table-cell px-4 py-2">User ID</TableHead>
                  <TableHead className="text-right sticky right-0 bg-card z-10 px-2 py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium sticky left-0 bg-card px-2 py-2">{profile.name || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-2 break-all">{profile.email}</TableCell> {/* Added break-all for aggressive email wrapping if needed */}
                    <TableCell className="hidden md:table-cell whitespace-nowrap px-4 py-2">{profile.id}</TableCell>
                    <TableCell className="text-right sticky right-0 bg-card px-2 py-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/admin/user-schools/${profile.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> View Schools
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg">No user profiles found.</p>
              <p className="text-sm">Ensure users have signed up and their profiles are created in Firestore under 'user_profiles'.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
