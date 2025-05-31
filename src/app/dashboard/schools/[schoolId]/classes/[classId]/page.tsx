
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, ChevronRight, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Student, School } from '@/lib/types';
import AddStudentForm from '@/components/student/add-student-form';
import StudentList from '@/components/student/student-list';
import { useAppState } from '@/context/AppStateContext';
import StudentIdCardViewer from '@/components/student/student-id-card-viewer';

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const schoolId = params.schoolId as string;
  const classId = decodeURIComponent(params.classId as string); 

  const { schools, students, deleteStudent, isLoading, currentUser } = useAppState();
  const { toast } = useToast();

  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingIdCardStudent, setViewingIdCardStudent] = useState<Student | null>(null);

  // school object is now needed by AddStudentForm
  const school = useMemo(() => schools.find(s => s.id === schoolId), [schools, schoolId]);
  
  const studentsInClass = useMemo(() => {
    return students.filter(s => s.schoolId === schoolId && s.className === classId);
  }, [students, schoolId, classId]);

  useEffect(() => {
    if (isLoading) return; 

    if (!currentUser) {
      router.replace('/login'); 
      return;
    }

    if (!school) {
      if(!isLoading) {
        toast({ variant: "destructive", title: "School not found" });
        router.push('/dashboard/schools');
      }
      return;
    }
    if (!school.classNames.includes(classId)) {
      if(!isLoading) {
        toast({ variant: "destructive", title: "Class not found in this school" });
        router.push(`/dashboard/schools/${schoolId}`);
      }
    }
  }, [school, classId, schoolId, router, toast, isLoading, currentUser, schools]);


  if (isLoading || (!currentUser && !isLoading) || (!school && !isLoading) ) { 
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading class details...</p>
      </div>
    );
  }


  const handleStudentAddedOrUpdated = () => {
    setIsAddStudentDialogOpen(false);
    setEditingStudent(null);
  };
  
  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsAddStudentDialogOpen(true);
  };

  const openAddStudentDialog = () => {
    setEditingStudent(null); 
    setIsAddStudentDialogOpen(true);
  }

  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    let name = decodeURIComponent(segment);
    if (segment === 'dashboard') name = 'Dashboard';
    else if (segment === 'schools' && pathSegments[index-1] === 'dashboard') name = 'Schools';
    else if (schools.find(s => s.id === segment && index > 0 && pathSegments[index-1] === 'schools')) name = schools.find(s => s.id === segment)?.name || segment;
    else if (segment === 'classes' && pathSegments[index-1] && schools.find(s => s.id === pathSegments[index-1])) {
        const actualClassName = decodeURIComponent(pathSegments[index+1]); 
        name = `Class: ${actualClassName}`;
    }
    
    const isLast = (index === pathSegments.length - 1) || (name.startsWith("Class: "));
    
    return { href, name, isLast };
  }).filter(b => b.name && b.name.toLowerCase() !== 'classes'); 


  return (
    <div className="space-y-6">
       <nav className="flex" aria-label="Breadcrumb">
        <ol role="list" className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.href + index}> 
              <div className="flex items-center">
                {!crumb.isLast ? (
                   <Link href={crumb.href} className="font-medium text-muted-foreground hover:text-primary">
                    {crumb.name}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{crumb.name}</span>
                )}
                {!crumb.isLast && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mx-2" />
                )}
              </div>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Class: {classId}</h1>
          {school && <p className="text-muted-foreground">Managing students in {classId} at {school.name}.</p>}
        </div>

        {school && ( // Ensure school object is available before rendering dialog
            <Dialog open={isAddStudentDialogOpen} onOpenChange={(isOpen) => {
            setIsAddStudentDialogOpen(isOpen);
            if (!isOpen) setEditingStudent(null); 
            }}>
            <DialogTrigger asChild>
                <Button onClick={openAddStudentDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <PlusCircle className="mr-2 h-5 w-5" />
                {editingStudent ? 'Edit Student' : 'Add Student'}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl"> 
                <DialogHeader>
                <DialogTitle>{editingStudent ? 'Edit Student Details' : 'Add New Student'}</DialogTitle>
                <DialogDescription>
                    {editingStudent ? 'Update the student\'s information.' : `Enter the details for the new student in ${classId} at ${school.name}.`}
                </DialogDescription>
                </DialogHeader>
                <AddStudentForm
                    school={school} // Pass the full school object
                    classNameFixed={classId} 
                    availableClasses={school.classNames} 
                    onStudentAddedOrUpdated={handleStudentAddedOrUpdated}
                    existingStudent={editingStudent}
                />
            </DialogContent>
            </Dialog>
        )}
      </div>
      
      {school && studentsInClass.length > 0 ? (
        <StudentList 
          students={studentsInClass} 
          school={school}
          onEditStudent={handleEditStudent}
          onDeleteStudent={(studentId) => deleteStudent(studentId)} // Pass studentId directly
          onGenerateIdCard={(student) => setViewingIdCardStudent(student)}
        />
      ) : (
         <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center shadow-sm">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold">No students in this class yet</h3>
          <p className="mt-2 mb-4 text-sm text-muted-foreground">
            Add students to {classId} to see them listed here.
          </p>
          {school && (
            <Button onClick={openAddStudentDialog} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Student
            </Button>
          )}
        </div>
      )}

      {viewingIdCardStudent && school && (
        <Dialog open={!!viewingIdCardStudent} onOpenChange={(isOpen) => !isOpen && setViewingIdCardStudent(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Student ID Card for {viewingIdCardStudent.name}</DialogTitle>
              <DialogDescription>Generated ID card. You can right-click to save the image.</DialogDescription>
            </DialogHeader>
            <StudentIdCardViewer student={viewingIdCardStudent} school={school} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
