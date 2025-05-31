
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Users, Download, PlusCircle, FileArchive } from 'lucide-react';
import type { Student, School, UserProfile } from '@/lib/types';
import AddStudentForm from '@/components/student/add-student-form';
import StudentList from '@/components/student/student-list';
import { useAppState } from '@/context/AppStateContext';
import StudentIdCardViewer from '@/components/student/student-id-card-viewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { getAppwritePreviewUrl } from '@/lib/appwrite';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { slugify } from '@/lib/utils';


export default function AdminClassStudentsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const schoolId = params.schoolId as string;
  const classId = decodeURIComponent(params.classId as string);
  const { toast } = useToast();

  const {
    isLoading: appIsLoading,
    isAdmin,
    fetchSchoolByIdForUser,
    fetchStudentsForClass,
    userProfiles,
    deleteStudent: deleteStudentFromContext,
  } = useAppState();


  const [school, setSchool] = useState<School | null>(null);
  const [studentsInClass, setStudentsInClass] = useState<Student[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [viewingIdCardStudent, setViewingIdCardStudent] = useState<Student | null>(null);
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  useEffect(() => {
    if (!appIsLoading && !isAdmin) {
      router.replace('/dashboard');
      return;
    }

    if (isAdmin && userId && schoolId && classId) {
      setIsFetchingData(true);
      const user = userProfiles.find(p => p.id === userId);
      setSelectedUser(user || null);

      Promise.all([
        fetchSchoolByIdForUser(userId, schoolId),
        fetchStudentsForClass(userId, schoolId, classId)
      ]).then(([fetchedSchool, fetchedStudents]) => {
        setSchool(fetchedSchool);
        setStudentsInClass(fetchedStudents);
      }).catch(err => {
        console.error("Error fetching school or student data for admin:", err);
        toast({ variant: "destructive", title: "Data Fetch Error", description: "Could not load necessary data."});
      })
      .finally(() => {
        setIsFetchingData(false);
      });
    } else if (!appIsLoading) {
        setIsFetchingData(false);
    }
  }, [appIsLoading, isAdmin, userId, schoolId, classId, fetchSchoolByIdForUser, fetchStudentsForClass, router, userProfiles, toast]);

  const handleExportToExcel = () => {
    if (!school || studentsInClass.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "No students in this class to export." });
      return;
    }

    let photoNumberCounter = 0;
    const dataToExport = studentsInClass.map(student => {
      let photoNumberInZip: string | number = "N/A";
      if (student.photoAppwriteId) { // A student is considered to have a photo if photoAppwriteId exists
        photoNumberCounter++;
        photoNumberInZip = photoNumberCounter;
      }
      return {
        'Student Name': student.name,
        "Father's Name": student.fatherName,
        'Class': student.className,
        'Roll Number': student.rollNumber,
        'Date of Birth': student.dateOfBirth,
        'Address': student.address,
        'Contact Number': student.contactNumber,
        'Photo Number (in ZIP)': photoNumberInZip, // This is the sequential number for photos with an ID
      };
    });

    if (dataToExport.length === 0) {
      toast({ title: "No Students with Photos", description: "No students to include in the Excel export.", variant: "default" });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${slugify(school.name || 'school')}_${slugify(classId)}_Students`);

    XLSX.writeFile(workbook, `${slugify(school.name || 'school')}_${slugify(classId)}_Students_AdminExport.xlsx`);
    toast({ title: "Excel Exported", description: "Student data has been exported." });
  };

  const handleDownloadZip = async () => {
    if (!school || studentsInClass.length === 0) {
      toast({ title: "No students or school data", description: "Cannot generate ZIP.", variant: "destructive" });
      return;
    }
    setIsZipping(true);
    toast({ title: "Preparing ZIP", description: "Fetching images, this may take a moment..." });

    const zip = new JSZip();
    const studentsWithPhotos = studentsInClass.filter(s => !!s.photoAppwriteId);
    let photoCounter = 0;

    for (const student of studentsWithPhotos) {
      if (student.photoAppwriteId) {
        const photoUrl = getAppwritePreviewUrl(student.photoAppwriteId);
        if (!photoUrl) {
          console.warn(`Could not get preview URL for student ${student.name}, Appwrite ID: ${student.photoAppwriteId}`);
          continue;
        }

        try {
          const response = await fetch(photoUrl);
          if (!response.ok) {
            console.error(`Failed to fetch image for ${student.name} from ${photoUrl}: ${response.statusText}`);
            toast({
              title: `Fetch failed for ${student.name}`,
              description: `Status: ${response.statusText}`,
              variant: "destructive"
            });
            continue;
          }
          const blob = await response.blob();
          
          photoCounter++; // Increment for sequential numbering in ZIP
          const originalFilename = student.photoAppwriteId.split('/').pop() || `${photoCounter}.jpg`;
          const extension = originalFilename.split('.').pop() || 'jpg';
          const filenameInZip = `${photoCounter}.${extension}`;

          zip.file(filenameInZip, blob);
        } catch (error) {
          console.error(`Error fetching or adding image to zip for student ${student.name}:`, error);
          toast({
            title: `Error for ${student.name}'s photo`,
            description: error instanceof Error ? error.message : String(error),
            variant: "destructive"
          });
        }
      }
    }

    if (photoCounter === 0) {
      toast({ title: "No Photos", description: "No students in this class have photos to download.", variant: "default" });
      setIsZipping(false);
      return;
    }

    try {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${slugify(school.name || 'school')}-${slugify(classId)}-photos.zip`);
      toast({ title: "Download Ready", description: "ZIP file has been generated." });
    } catch (error) {
      console.error("Error generating ZIP file:", error);
      toast({ title: "ZIP Generation Failed", description: String(error), variant: "destructive" });
    } finally {
      setIsZipping(false);
    }
  };


  const handleStudentAddedOrUpdated = async () => {
    setIsAddStudentDialogOpen(false);
    setEditingStudent(null);
    if(school && userId && isAdmin) { 
        setIsFetchingData(true);
        try {
            // Re-fetch students for this specific class to ensure data is fresh
            const fetchedStudents = await fetchStudentsForClass(userId, school.id, classId);
            setStudentsInClass(fetchedStudents);
        } catch (err) {
            toast({variant: "destructive", title: "Student List Update Failed"});
        } finally {
            setIsFetchingData(false);
        }
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsAddStudentDialogOpen(true);
  };

  const handleDeleteStudentWrapper = async (studentId: string) => {
     if (!selectedUser) { 
        toast({variant: "destructive", title: "Cannot delete", description: "Target user not identified."});
        return;
     }
    try {
      await deleteStudentFromContext(studentId, selectedUser.id); // Pass targetUserId
      // Optimistically update local state or re-fetch
      setStudentsInClass(prev => prev.filter(s => s.id !== studentId));
      toast({ title: "Student Deleted", description: "Student has been removed." });
    } catch (error) {
      toast({ variant: "destructive", title: "Deletion Failed", description: (error instanceof Error ? error.message : "Could not delete student.") });
      // Optionally re-fetch students if optimistic update fails or to ensure consistency
      if(school && userId && isAdmin) {
        const fetchedStudents = await fetchStudentsForClass(userId, school.id, classId);
        setStudentsInClass(fetchedStudents);
      }
    }
  };

  const openAddStudentDialog = () => {
    setEditingStudent(null);
    setIsAddStudentDialogOpen(true);
  };


  if (appIsLoading || isFetchingData) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading student data...</p>
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

  const userDisplayName = selectedUser?.name || selectedUser?.email || userId;

  if (!school) {
    return (
      <div className="space-y-6 p-4">
         <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/admin/user-classes/${userId}/${schoolId}`)}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Classes for school {schoolId}
        </Button>
        <p className="text-lg text-center text-muted-foreground">School data not found for user {userDisplayName}.</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
       <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/admin/user-classes/${userId}/${schoolId}`)}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Classes for {school.name}
      </Button>

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-grow">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Class: {classId}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Students in {classId} at {school.name} (User: {userDisplayName}).
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Dialog open={isAddStudentDialogOpen} onOpenChange={(isOpen) => {
                setIsAddStudentDialogOpen(isOpen);
                if (!isOpen) setEditingStudent(null);
            }}>
            <DialogTrigger asChild>
                <Button onClick={openAddStudentDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
                <PlusCircle className="mr-2 h-5 w-5" />
                {editingStudent ? 'Edit Student' : 'Add Student'}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                <DialogTitle>{editingStudent ? 'Edit Student Details' : 'Add New Student'}</DialogTitle>
                <DialogDescription>
                    {editingStudent ? `Update student in ${classId} at ${school.name} (User: ${userDisplayName}).` : `Enter details for new student in ${classId} at ${school.name} (User: ${userDisplayName}).`}
                </DialogDescription>
                </DialogHeader>
                {school && (
                    <AddStudentForm
                        school={school} 
                        classNameFixed={classId}
                        availableClasses={school.classNames}
                        onStudentAddedOrUpdated={handleStudentAddedOrUpdated}
                        existingStudent={editingStudent}
                        targetUserId={userId} 
                    />
                )}
            </DialogContent>
            </Dialog>
            <Button
              onClick={handleExportToExcel}
              disabled={studentsInClass.length === 0 || isZipping}
              className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto"
            >
              <Download className="mr-2 h-5 w-5" />
              Export to Excel
            </Button>
             <Button
              onClick={handleDownloadZip}
              disabled={studentsInClass.filter(s => !!s.photoAppwriteId).length === 0 || isZipping}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
            >
              {isZipping ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileArchive className="mr-2 h-5 w-5" />}
              {isZipping ? 'Zipping...' : 'Download Photos'}
            </Button>
        </div>
      </div>

      {studentsInClass.length > 0 && school ? (
        <StudentList
          students={studentsInClass} // Pass the locally managed studentsInClass
          school={school}
          onEditStudent={handleEditStudent}
          onDeleteStudent={handleDeleteStudentWrapper}
          onGenerateIdCard={(student) => setViewingIdCardStudent(student)}
        />
      ) : (
         <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center shadow-sm">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold">No students in this class yet</h3>
          <p className="mt-2 mb-4 text-sm text-muted-foreground">
            This class currently has no students for user {userDisplayName}.
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

