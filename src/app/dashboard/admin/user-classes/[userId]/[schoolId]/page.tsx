
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppState } from '@/context/AppStateContext';
import type { School, UserProfile, Student } from '@/lib/types'; // Added Student
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Loader2, ChevronLeft, SchoolIcon as PlaceholderSchoolIcon, Trash2, PlusCircle, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PREDEFINED_CLASSES } from '@/lib/types';
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


export default function AdminUserSchoolClassesPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string; // This is targetUserId
  const schoolId = params.schoolId as string;
  const { toast } = useToast();

  const { isLoading, isAdmin, fetchSchoolByIdForUser, fetchStudentsForClass, userProfiles, updateSchoolClassNames, deleteStudent } = useAppState();
  
  const [school, setSchool] = useState<School | null>(null);
  const [studentsCounts, setStudentsCounts] = useState<{[key: string]: number}>({});
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);

  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);
  const [selectedClassesToAdd, setSelectedClassesToAdd] = useState<string[]>([]);


  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace('/dashboard');
      return;
    }
    if (isAdmin && userId && schoolId) {
      const user = userProfiles.find(p => p.id === userId);
      setSelectedUser(user || null);

      setIsFetchingData(true);
      fetchSchoolByIdForUser(userId, schoolId)
        .then(async (fetchedSchool) => {
          setSchool(fetchedSchool);
          if (fetchedSchool) {
            const counts: {[key: string]: number} = {};
            for (const className of fetchedSchool.classNames) {
              const students = await fetchStudentsForClass(userId, schoolId, className);
              counts[className] = students.length;
            }
            setStudentsCounts(counts);
          }
        })
        .finally(() => setIsFetchingData(false));
    } else if (!isLoading) {
        setIsFetchingData(false);
    }
  }, [isLoading, isAdmin, userId, schoolId, fetchSchoolByIdForUser, fetchStudentsForClass, router, userProfiles]);

  const handleAddSelectedClasses = async () => {
    if (!school || selectedClassesToAdd.length === 0) {
      toast({ variant: "destructive", title: "No classes selected or school not found." });
      return;
    }
    const newClassNames = Array.from(new Set([...school.classNames, ...selectedClassesToAdd]));
    try {
        await updateSchoolClassNames(school.id, newClassNames, school.userId); // Pass school.userId as targetUserId
        setSchool(prev => prev ? { ...prev, classNames: newClassNames } : null); 
        toast({ title: "Classes Added", description: `Selected classes added to ${school.name}.` });
        setIsAddClassDialogOpen(false);
        setSelectedClassesToAdd([]);
        const counts: {[key: string]: number} = {};
        for (const className of newClassNames) {
            const students = await fetchStudentsForClass(userId, schoolId, className);
            counts[className] = students.length;
        }
        setStudentsCounts(counts);
    } catch (error) {
        toast({ variant: "destructive", title: "Failed to add classes."});
    }
  };

  const handleDeleteClass = async (classNameToDelete: string) => {
    if (!school) return;
    // Admin can delete class even if it has students
    const studentsInClassCount = studentsCounts[classNameToDelete] || 0;
     if (studentsInClassCount > 0) {
      toast({
        variant: "default",
        title: "Note: Deleting Class with Students",
        description: `Admin deleting class "${classNameToDelete}" which has ${studentsInClassCount} student(s). Students will remain but become unassigned from this class (or deleted if school is deleted).`,
      });
    }

    const updatedClassNames = school.classNames.filter(c => c !== classNameToDelete);
    try {
        await updateSchoolClassNames(school.id, updatedClassNames, school.userId); // Pass school.userId as targetUserId
        setSchool(prev => prev ? { ...prev, classNames: updatedClassNames } : null); 
        toast({ title: "Class Deleted", description: `Class "${classNameToDelete}" has been deleted.` });
        setStudentsCounts(prevCounts => {
            const newCounts = {...prevCounts};
            delete newCounts[classNameToDelete];
            return newCounts;
        });
    } catch (error) {
        toast({ variant: "destructive", title: "Failed to delete class."});
    }
  };


  if (isLoading || isFetchingData) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading school classes...</p>
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

  if (!school) {
    return (
      <div className="space-y-6">
         <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/admin/user-schools/${userId}`)}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to User's Schools
        </Button>
        <p className="text-lg text-center text-muted-foreground">School not found or access denied.</p>
      </div>
    );
  }
  
  const userDisplayName = selectedUser?.name || selectedUser?.email || userId;

  return (
    <div className="space-y-6">
       <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/admin/user-schools/${userId}`)}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Schools for {userDisplayName}
      </Button>

      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 flex items-center justify-center bg-background rounded-lg border p-1">
                    <PlaceholderSchoolIcon size={32} className="text-primary" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold">{school.name}</CardTitle>
                  <CardDescription className="text-md">Classes for {school.name} (User: {userDisplayName}).</CardDescription>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold text-primary">Classes List</h2>
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
                        {PREDEFINED_CLASSES.map(pClassName => ( 
                          <div key={pClassName} className="flex items-center space-x-2">
                            <Checkbox
                              id={`class-admin-${pClassName}`}
                              checked={selectedClassesToAdd.includes(pClassName) || school.classNames.includes(pClassName)}
                              disabled={school.classNames.includes(pClassName)}
                              onCheckedChange={(checked) => {
                                setSelectedClassesToAdd(prev => 
                                  checked ? [...prev, pClassName] : prev.filter(c => c !== pClassName)
                                );
                              }}
                            />
                            <label
                              htmlFor={`class-admin-${pClassName}`}
                              className={`text-sm font-medium leading-none ${school.classNames.includes(pClassName) ? 'text-muted-foreground cursor-not-allowed' : 'peer-disabled:cursor-not-allowed peer-disabled:opacity-70'}`}
                            >
                              {pClassName} {school.classNames.includes(pClassName) && "(Already Added)"}
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
                            {studentsCounts[className] !== undefined ? studentsCounts[className] : <Loader2 className="h-4 w-4 animate-spin" />}
                        </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/admin/user-students/${userId}/${schoolId}/${encodeURIComponent(className)}`}>
                            <Eye className="mr-2 h-4 w-4" /> View Students
                            </Link>
                        </Button>
                        {/* Edit button for class name removed */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Class
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Class "{className}"?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                     This will remove the class from {school.name}. Students in this class will not be deleted but will need to be reassigned if this is not desired (or will be removed if the school is deleted). Are you sure?
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
            <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">No classes found for this school.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
