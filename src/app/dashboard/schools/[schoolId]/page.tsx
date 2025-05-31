
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Trash2, ChevronLeft, Eye, Loader2, SchoolIcon as PlaceholderSchoolIcon } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import type { School } from '@/lib/types';
import { PREDEFINED_CLASSES } from '@/lib/types';
import { useAppState } from '@/context/AppStateContext';
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


export default function SchoolDetailPage() {
  const router = useRouter();
  const params = useParams();
  const schoolId = params.schoolId as string;
  
  const { schools, students, updateSchoolClassNames, deleteSchool, isLoading, currentUser, isAdmin } = useAppState();
  const { toast } = useToast();

  const [school, setSchool] = useState<School | null>(null);
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);
  const [selectedClassesToAdd, setSelectedClassesToAdd] = useState<string[]>([]);

  useEffect(() => {
    if (isLoading) return;

    const effectiveUser = currentUser;
    if (!effectiveUser && !isAdmin) { // If not admin and no user, redirect to login
        router.replace('/login');
        return;
    }

    const currentSchool = schools.find(s => s.id === schoolId);
    if (currentSchool) {
      // If admin, they can view any school. If not admin, check ownership.
      if (!isAdmin && currentSchool.userId !== currentUser?.uid ) {
          toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to view this school."});
          router.push('/dashboard/schools');
          return;
      }
      setSchool(currentSchool);
      setSelectedClassesToAdd([]); 
    } else if (!isLoading && !isAdmin && schools.length > 0) { 
      // If not loading, not admin, and schools have loaded but this one wasn't found for this user
      toast({ variant: "destructive", title: "School not found" });
      router.push('/dashboard/schools');
    } else if (!isLoading && isAdmin && !currentSchool) {
        // Admin trying to view a school that doesn't exist (or hasn't loaded yet in their specific view)
        // This case might need fetching the school directly if not in admin's preloaded list
        // For now, we assume admin context might not have this school pre-loaded if it belongs to another user
        console.warn(`Admin viewing school ID ${schoolId} which is not in their immediate 'schools' context. May need direct fetch.`);
    }
  }, [schoolId, schools, router, toast, isLoading, currentUser, isAdmin]);


  const effectiveUserCheck = currentUser || isAdmin; // Looser check for page rendering before redirect

  if (isLoading || (!effectiveUserCheck && !isLoading) ) {
    return (
        <div className="flex h-full w-full items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg">Loading school details...</p>
        </div>
    );
  }
  
  if (!school) { 
      // This might be hit by admin if they navigate directly to a school not in their initially loaded list
      // Or if a regular user tries to access a non-existent/unauthorized school
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <Button variant="outline" size="sm" onClick={() => router.push(isAdmin ? '/dashboard/admin' :'/dashboard/schools')} className="mb-4 self-start">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <p className="text-lg text-muted-foreground">School not found or you do not have permission.</p>
          {isAdmin && <p className="text-sm text-muted-foreground">(Admin: If this school exists for another user, access it via User Management.)</p>}
        </div>
      );
  }

  const handleAddSelectedClasses = async () => {
    if (selectedClassesToAdd.length === 0) {
      toast({ variant: "destructive", title: "No classes selected." });
      return;
    }
    const newClassNames = Array.from(new Set([...school.classNames, ...selectedClassesToAdd]));
    try {
        // Admin might update classes for another user, so pass school.userId
        await updateSchoolClassNames(school.id, newClassNames, school.userId); 
        toast({ title: "Classes Added", description: `Selected classes added to ${school.name}.` });
        setIsAddClassDialogOpen(false);
        setSelectedClassesToAdd([]); 
        // Manually update local school state for immediate UI update
        setSchool(prev => prev ? { ...prev, classNames: newClassNames } : null);
    } catch (error) {
        toast({ variant: "destructive", title: "Failed to add classes."});
    }
  };
  
  const handleDeleteClass = async (classNameToDelete: string) => {
    // Admin can delete class even if it has students, regular user cannot if students exist.
    const studentsInClassCount = students.filter(s => s.schoolId === school.id && s.className === classNameToDelete && s.userId === school.userId).length;
    if (!isAdmin && studentsInClassCount > 0) {
      toast({
        variant: "destructive",
        title: "Cannot Delete Class",
        description: `Class "${classNameToDelete}" has ${studentsInClassCount} student(s). Please move or delete them first.`,
      });
      return;
    }
     if (isAdmin && studentsInClassCount > 0) {
      toast({
        variant: "default",
        title: "Note: Deleting Class with Students",
        description: `Admin deleting class "${classNameToDelete}" which has ${studentsInClassCount} student(s). Students will remain but become unassigned from this class.`,
      });
    }


    const updatedClassNames = school.classNames.filter(c => c !== classNameToDelete);
    try {
        await updateSchoolClassNames(school.id, updatedClassNames, school.userId);
        toast({ title: "Class Deleted", description: `Class "${classNameToDelete}" has been deleted.` });
        setSchool(prev => prev ? { ...prev, classNames: updatedClassNames } : null);
    } catch (error) {
        toast({ variant: "destructive", title: "Failed to delete class."});
    }
  };

  const handleDeleteSchoolAndRedirect = async () => {
    try {
      // Admin might delete another user's school, so pass school.userId
      await deleteSchool(school.id, school.userId); 
      toast({ title: "School Deleted", description: `School "${school.name}" and its data have been deleted.`});
      router.push(isAdmin && school.userId !== currentUser?.uid ? `/dashboard/admin/user-schools/${school.userId}` : '/dashboard/schools');
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete school."});
    }
  }

  const studentsInSchool = students.filter(s => s.schoolId === school.id && s.userId === school.userId);

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 flex items-center justify-center bg-background rounded-lg border p-1">
                <PlaceholderSchoolIcon size={32} className="text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold">{school.name}</CardTitle>
                <CardDescription className="text-md">Manage classes and students for {school.name}.</CardDescription>
              </div>
            </div>
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete School
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the school "{school.name}" and all its associated classes and students.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSchoolAndRedirect} className="bg-destructive hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold text-primary">Classes</h2>
                <Dialog open={isAddClassDialogOpen} onOpenChange={setIsAddClassDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Classes
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Classes to {school.name}</DialogTitle>
                      <DialogDesc>Select classes to add. Existing classes are disabled.</DialogDesc>
                    </DialogHeader>
                    <ScrollArea className="h-64 my-4">
                      <div className="space-y-2 p-1">
                        {PREDEFINED_CLASSES.map(className => (
                          <div key={className} className="flex items-center space-x-2">
                            <Checkbox
                              id={`class-${className}`}
                              checked={selectedClassesToAdd.includes(className) || school.classNames.includes(className)}
                              disabled={school.classNames.includes(className)}
                              onCheckedChange={(checked) => {
                                setSelectedClassesToAdd(prev => 
                                  checked ? [...prev, className] : prev.filter(c => c !== className)
                                );
                              }}
                            />
                            <label
                              htmlFor={`class-${className}`}
                              className={`text-sm font-medium leading-none ${school.classNames.includes(className) ? 'text-muted-foreground cursor-not-allowed' : 'peer-disabled:cursor-not-allowed peer-disabled:opacity-70'}`}
                            >
                              {className} {school.classNames.includes(className) && "(Already Added)"}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                      <Button onClick={handleAddSelectedClasses}>Add Selected Classes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {school.classNames.length > 0 ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class Name</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {school.classNames.map((className) => (
                        <TableRow key={className}>
                          <TableCell>{className}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {students.filter(s => s.schoolId === school.id && s.className === className && s.userId === school.userId).length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button asChild variant="outline" size="icon" className="h-8 w-8">
                              <Link href={`/dashboard/schools/${schoolId}/classes/${encodeURIComponent(className)}`}>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View Class</span>
                              </Link>
                            </Button>
                             <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8 hover:border-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete Class</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Class "{className}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {isAdmin && students.filter(s => s.schoolId === school.id && s.className === className && s.userId === school.userId).length > 0
                                      ? `This class has students. Deleting it will remove the class, but students will need to be reassigned manually if desired. Are you sure?`
                                      : `This will remove the class. Are you sure?`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteClass(className)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">No classes added yet. Click "Add Classes" to get started.</p>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-3 text-primary">School Statistics</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Classes</CardDescription>
                    <CardTitle className="text-3xl">{school.classNames.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Students</CardDescription>
                    <CardTitle className="text-3xl">{studentsInSchool.length}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
