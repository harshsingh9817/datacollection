
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Student, School } from '@/lib/types';
import { DEFAULT_PLACEHOLDER_IMAGE_URL } from '@/lib/types';
import { Edit3, Trash2, Clipboard, UserCircle2 } from 'lucide-react';
import NextImage from 'next/image';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAppwritePreviewUrl } from '@/lib/appwrite'; // For displaying Appwrite images

interface StudentListProps {
  students: Student[];
  school: School; 
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onGenerateIdCard: (student: Student) => void;
}

export default function StudentList({ students, school, onEditStudent, onDeleteStudent, onGenerateIdCard }: StudentListProps) {

  return (
    <Card className="shadow-lg">
       <CardHeader>
        <CardTitle>Student Roster</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] sticky left-0 bg-card z-10 px-2 py-2">Photo</TableHead>
              <TableHead className="sticky left-[66px] bg-card z-10 px-4 py-2 whitespace-nowrap">Name</TableHead>
              <TableHead className="hidden sm:table-cell px-4 py-2 whitespace-nowrap">Father's Name</TableHead>
              <TableHead className="px-4 py-2">Roll No.</TableHead>
              <TableHead className="hidden md:table-cell px-4 py-2 whitespace-nowrap">DOB</TableHead>
              <TableHead className="hidden md:table-cell max-w-xs truncate px-4 py-2">Address</TableHead>
              <TableHead className="hidden sm:table-cell px-4 py-2 whitespace-nowrap">Contact</TableHead>
              <TableHead className="text-right sticky right-0 bg-card z-10 px-4 py-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const photoUrl = student.photoAppwriteId 
                ? getAppwritePreviewUrl(student.photoAppwriteId) 
                : null;
              return (
                <TableRow key={student.id}>
                  <TableCell className="sticky left-0 bg-card px-2 py-2">
                    {photoUrl ? (
                      <NextImage
                        src={photoUrl}
                        alt={`${student.name}'s photo`}
                        width={32}
                        height={32}
                        className="rounded-full object-cover aspect-square bg-muted p-0.5"
                        data-ai-hint="student photo"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.srcset = DEFAULT_PLACEHOLDER_IMAGE_URL;
                          target.src = DEFAULT_PLACEHOLDER_IMAGE_URL;
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground" title="No photo">
                        <UserCircle2 className="w-5 h-5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap sticky left-[66px] bg-card px-4 py-2">{student.name}</TableCell>
                  <TableCell className="hidden sm:table-cell whitespace-nowrap px-4 py-2">{student.fatherName}</TableCell>
                  <TableCell className="px-4 py-2">
                    <Badge variant="secondary">{student.rollNumber}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell whitespace-nowrap px-4 py-2">{student.dateOfBirth}</TableCell>
                  <TableCell className="hidden md:table-cell max-w-xs truncate px-4 py-2">{student.address}</TableCell>
                  <TableCell className="hidden sm:table-cell whitespace-nowrap px-4 py-2">{student.contactNumber}</TableCell>
                  <TableCell className="text-right space-x-1 sticky right-0 bg-card px-4 py-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 hover:border-accent hover:text-accent"
                      onClick={() => onGenerateIdCard(student)}
                      title="Generate ID Card"
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEditStudent(student)}
                      title="Edit Student"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 hover:border-destructive hover:text-destructive" title="Delete Student">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the student "{student.name}" and their photo from Appwrite storage.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDeleteStudent(student.id)} className="bg-destructive hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
