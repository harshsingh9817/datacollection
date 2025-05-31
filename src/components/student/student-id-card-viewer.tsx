
'use client';

import React, { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { Student, School } from '@/lib/types';
import { handleGenerateIdCardAction } from '@/actions/generate-id-action';
// getAppwritePreviewUrl is not directly needed here as action handles URL construction if needed

interface StudentIdCardViewerProps {
  student: Student;
  school: School; 
}

export default function StudentIdCardViewer({ student, school }: StudentIdCardViewerProps) {
  const [idCardImageUri, setIdCardImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateCard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // The action now takes studentPhotoAppwriteId directly.
        // It also needs schoolId and userId to potentially fetch school-specific details if ever needed.
        // However, for student photos, only student.photoAppwriteId is currently used by the action
        // to get the preview URL which it then converts to a data URI.
        const inputForAction = {
          schoolName: school.name,
          studentName: student.name,
          fatherName: student.fatherName,
          className: student.className,
          rollNumber: student.rollNumber,
          dateOfBirth: student.dateOfBirth,
          address: student.address,
          contactNumber: student.contactNumber,
          studentPhotoAppwriteId: student.photoAppwriteId, 
          schoolId: school.id, // Pass schoolId
          userId: student.userId, // Pass student's userId (owner of the student document)
        };
        
        console.log("StudentIdCardViewer: Calling handleGenerateIdCardAction with studentPhotoAppwriteId:", inputForAction.studentPhotoAppwriteId);
        const result = await handleGenerateIdCardAction(inputForAction);
        
        if (result.success && result.data) {
          setIdCardImageUri(result.data.idCardImageDataUri);
        } else {
          console.error("StudentIdCardViewer: ID Card generation failed.", result.error);
          setError(result.error || 'Failed to generate ID card.');
        }
      } catch (e) {
        console.error("StudentIdCardViewer: Exception during ID Card generation.", e);
        setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    generateCard();
  }, [student, school]); // student.userId also ensures re-fetch if student object changes owner (unlikely but good practice)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[300px] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-foreground">Generating ID Card...</p>
        <p className="text-sm text-muted-foreground">This may take a few moments.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[300px] text-center text-destructive-foreground bg-destructive/10 border border-destructive rounded-md">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-semibold">Error Generating ID Card</p>
        <p className="text-sm mb-4">{error}</p>
      </div>
    );
  }

  if (idCardImageUri) {
    return (
      <div className="p-4 border rounded-lg shadow-md bg-card">
        <NextImage
          src={idCardImageUri}
          alt={`ID Card for ${student.name}`}
          width={300}
          height={475}
          className="rounded-md object-contain mx-auto"
          data-ai-hint="student ID card"
        />
         <p className="text-xs text-muted-foreground text-center mt-2">Right-click or long-press to save the image.</p>
      </div>
    );
  }

  return <div className="p-6 text-center text-muted-foreground">No ID card image available.</div>;
}
