
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppState } from '@/context/AppStateContext';
import type { School, UserProfile } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Building, Loader2, ChevronLeft, SchoolIcon as PlaceholderSchoolIcon, Trash2, PlusCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import AddSchoolForm from '@/components/school/add-school-form'; // For admin to add school for user
import { Dialog, DialogContent, DialogHeader, DialogTitle as DialogFormTitle, DialogDescription as DialogFormDescription, DialogTrigger } from '@/components/ui/dialog'; // Aliased DialogTitle for form


export default function AdminUserSchoolsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string; // This is the targetUserId
  const { toast } = useToast();

  const { isLoading, isAdmin, fetchSchoolsForUser, userProfiles, deleteSchool: deleteSchoolFromContext } = useAppState();
  const [schoolsForUser, setSchoolsForUser] = useState<School[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [isAddSchoolDialogOpen, setIsAddSchoolDialogOpen] = useState(false);


  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace('/dashboard');
      return;
    }
    if (isAdmin && userId) {
      const user = userProfiles.find(p => p.id === userId);
      setSelectedUser(user || null);

      setIsFetchingData(true); 
      fetchSchoolsForUser(userId) // Fetch schools for the targetUserId
        .then(fetchedSchools => {
            setSchoolsForUser(fetchedSchools);
            setIsFetchingData(false);
        })
        .catch(error => {
            console.error("Error fetching schools for user:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch schools."});
            setIsFetchingData(false);
        });
    } else if (!isLoading) { 
        setIsFetchingData(false);
    }
  }, [isLoading, isAdmin, userId, fetchSchoolsForUser, router, userProfiles, toast]);

  const handleDeleteSchool = async (schoolId: string, schoolName: string) => {
    if (!selectedUser) return; // Should always have selectedUser if on this page
    try {
        await deleteSchoolFromContext(schoolId, selectedUser.id); // Admin deleting school for targetUserId
        setSchoolsForUser(prev => prev.filter(s => s.id !== schoolId));
        toast({ title: "School Deleted", description: `School "${schoolName}" has been removed for user ${selectedUser.name || selectedUser.email}.`});
    } catch (error) {
        console.error("Error deleting school by admin:", error);
        toast({ variant: "destructive", title: "Deletion Failed", description: (error instanceof Error ? error.message : "Could not delete school.") });
    }
  };


  if (isLoading || isFetchingData) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading user's schools...</p>
      </div>
    );
  }

  if (!isAdmin) {
     return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <p className="text-lg text-destructive">Access Denied. Redirecting...</p>
      </div>
    );
  }
  
  if (!selectedUser) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/admin')} className="mb-4">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Users List
        </Button>
        <p className="text-lg text-center text-muted-foreground">User not found.</p>
      </div>
    );
  }
  
  const userDisplayName = selectedUser?.name || selectedUser?.email || userId;

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/admin')}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Users List
      </Button>
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle className="text-2xl font-bold flex items-center">
                    <Building className="mr-3 h-7 w-7 text-primary" />
                    Schools for {userDisplayName}
                </CardTitle>
                <CardDescription>List of schools managed by this user. ({schoolsForUser.length} found)</CardDescription>
            </div>
            <Dialog open={isAddSchoolDialogOpen} onOpenChange={setIsAddSchoolDialogOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add School for {userDisplayName}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogFormTitle>Add New School for {userDisplayName}</DialogFormTitle>
                        <DialogFormDescription>
                            Enter details for the new school. This school will be associated with {userDisplayName}.
                        </DialogFormDescription>
                    </DialogHeader>
                    <AddSchoolForm 
                        onSchoolAdded={() => {
                            setIsAddSchoolDialogOpen(false);
                            // Re-fetch schools to update list
                            setIsFetchingData(true);
                            fetchSchoolsForUser(userId).then(setSchoolsForUser).finally(() => setIsFetchingData(false));
                        }} 
                        targetUserId={userId} // Pass targetUserId for admin operation
                    />
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {schoolsForUser.length > 0 ? (
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] sm:w-[80px] hidden">Logo</TableHead>
                  <TableHead>School Name</TableHead>
                  <TableHead className="hidden md:table-cell">Classes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schoolsForUser.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="hidden">
                      <div className="w-10 h-10 flex items-center justify-center bg-muted rounded text-muted-foreground">
                        <PlaceholderSchoolIcon size={20} />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{school.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{school.classNames.join(', ')}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/admin/user-classes/${userId}/${school.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> View Classes
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete School "{school.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the school and all its associated classes and students for user {userDisplayName}. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSchool(school.id, school.name)} className="bg-destructive hover:bg-destructive/90">
                              Confirm Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg">No schools found for {userDisplayName}.</p>
               <Button size="sm" onClick={() => setIsAddSchoolDialogOpen(true)} className="mt-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add School for {userDisplayName}
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
