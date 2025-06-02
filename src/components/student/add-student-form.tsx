'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
// Removed Popover and Calendar imports as they are no longer used for DOB
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format, parse, isValid, getYear, getMonth, getDate } from 'date-fns'; // Added getYear, getMonth, getDate
import { User, Hash, HomeIcon as AddressHomeIcon, Phone, Loader2, ImageUp, Trash2, Users as UsersIcon, CalendarDays } from 'lucide-react'; // Replaced Cake with CalendarDays for icon
import { useToast } from '@/hooks/use-toast';
import type { Student, School } from '@/lib/types';
import { DEFAULT_PLACEHOLDER_IMAGE_URL } from '@/lib/types';
import React, { useEffect, useState, useRef } from 'react';
import { useAppState } from '@/context/AppStateContext';
import NextImage from 'next/image';
import { uploadFileToAppwriteStorage, getAppwritePreviewUrl, deleteFileFromAppwriteStorage } from '@/lib/appwrite';

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// --- Zod Schema Changes for DOB ---
const studentSchemaBase = z.object({
  name: z.string().min(2, { message: 'Student name must be at least 2 characters.' }).default(''),
  fatherName: z.string().min(2, { message: "Father's name must be at least 2 characters." }).default(''),
  className: z.string().min(1, { message: 'Please select a class.' }).default(''),
  rollNumber: z.string().min(1, { message: 'Roll number is required.' }).default(''),
  // DOB fields as strings
  dobDay: z.string().min(1, { message: "Day is required."}),
  dobMonth: z.string().min(1, { message: "Month is required."}),
  dobYear: z.string().min(1, { message: "Year is required."}),
  address: z.string().min(5, { message: 'Address must be at least 5 characters.' }).default(''),
  contactNumber: z.string().regex(/^\+?[0-9\s-()]{7,20}$/, { message: 'Invalid contact number format.' }).default(''),
  schoolId: z.string().default(''),
  photoFile: z.custom<FileList>().optional(),
});

const studentSchemaWithDateValidation = studentSchemaBase.superRefine((data, ctx) => {
  const day = parseInt(data.dobDay, 10);
  const month = parseInt(data.dobMonth, 10); // Month is 1-12 from select
  const year = parseInt(data.dobYear, 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    // Should ideally be caught by individual field string validation
    // but good as a fallback.
    if (isNaN(day)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid day.", path: ["dobDay"] });
    if (isNaN(month)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid month.", path: ["dobMonth"] });
    if (isNaN(year)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid year.", path: ["dobYear"] });
    return z.NEVER; // Indicate validation failure
  }

  const date = new Date(year, month - 1, day); // JS month is 0-11

  if (!isValid(date) || date.getFullYear() !== year || date.getMonth() !== (month - 1) || date.getDate() !== day) {
    ctx.addIssue({
      code: z.ZodIssueCode.invalid_date,
      message: "The selected day is not valid for the chosen month/year.",
      path: ["dobDay"], // Associates error with the Day field primarily
    });
    return z.NEVER;
  }

  const today = new Date();
  today.setHours(0,0,0,0); // Normalize today to midnight for comparison
  if (date > today) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date of birth cannot be in the future.", path: ["dobYear"] });
    return z.NEVER;
  }
  if (date < new Date('1900-01-01')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date of birth should not be before 1900.", path: ["dobYear"] });
    return z.NEVER;
  }
}).transform(data => {
    const day = parseInt(data.dobDay, 10);
    const month = parseInt(data.dobMonth, 10);
    const year = parseInt(data.dobYear, 10);
    return {
        ...data,
        _validatedDateOfBirth: new Date(year, month - 1, day) // Store the validated Date object
    };
});

const studentSchema = studentSchemaWithDateValidation.refine(
  (data) => {
    if (data.photoFile && data.photoFile.length > 0) {
      return data.photoFile[0].size <= MAX_FILE_SIZE_BYTES;
    }
    return true;
  },
  {
    message: `Photo size must be less than ${MAX_FILE_SIZE_MB}MB.`,
    path: ['photoFile'],
  }
);
// --- End of Zod Schema Changes ---

type AddStudentFormInputValues = z.input<typeof studentSchemaWithDateValidation>; // For useForm's defaultValues and field types
type AddStudentFormSubmitValues = z.output<typeof studentSchema>; // For onSubmit data type

// --- Date Generation Utilities ---
const currentYear = getYear(new Date());
const years = Array.from({ length: 120 }, (_, i) => currentYear - i); // Up to 120 years back
const months = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];
const days = Array.from({ length: 31 }, (_, i) => i + 1);
// --- End of Date Generation Utilities ---

interface AddStudentFormProps {
  school: School;
  classNameFixed: string;
  availableClasses: string[];
  onStudentAddedOrUpdated: () => void;
  existingStudent?: Student | null;
  targetUserId?: string;
}

export default function AddStudentForm({
  school,
  classNameFixed,
  availableClasses,
  onStudentAddedOrUpdated,
  existingStudent,
  targetUserId,
}: AddStudentFormProps) {
  const { toast } = useToast();
  const { addStudent: addStudentToContext, updateStudent: updateStudentInContext, currentUser, isAdmin } = useAppState();
  const [photoPreview, setPhotoPreview] = useState<string | null>(DEFAULT_PLACEHOLDER_IMAGE_URL);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultSelectedClass = classNameFixed || (availableClasses.length > 0 ? availableClasses[0] : '');

  const form = useForm<AddStudentFormInputValues>({ // Use input type for form
    resolver: zodResolver(studentSchema), // Final schema for full validation
    defaultValues: {
      name: '',
      fatherName: '',
      className: defaultSelectedClass,
      rollNumber: '',
      // DOB default values
      dobDay: '',
      dobMonth: '',
      dobYear: '',
      address: '',
      contactNumber: '',
      schoolId: school?.id || '',
      photoFile: undefined,
    },
  });

 useEffect(() => {
    const newStudentClassName = classNameFixed || (availableClasses.length > 0 ? availableClasses[0] : '');
    if (existingStudent) {
      let dobDay = '', dobMonth = '', dobYear = '';
      if (existingStudent.dateOfBirth) {
        const parsedDate = parse(existingStudent.dateOfBirth, 'yyyy-MM-dd', new Date());
        if (isValid(parsedDate)) {
          dobDay = String(getDate(parsedDate));
          dobMonth = String(getMonth(parsedDate) + 1); // getMonth is 0-indexed
          dobYear = String(getYear(parsedDate));
        }
      }

      form.reset({
        name: existingStudent.name || '',
        fatherName: existingStudent.fatherName || '',
        className: existingStudent.className || newStudentClassName,
        rollNumber: existingStudent.rollNumber || '',
        dobDay,
        dobMonth,
        dobYear,
        address: existingStudent.address || '',
        contactNumber: existingStudent.contactNumber || '',
        schoolId: existingStudent.schoolId || school?.id || '',
        photoFile: undefined,
      });
      if (existingStudent.photoAppwriteId) {
        const previewUrl = getAppwritePreviewUrl(existingStudent.photoAppwriteId);
        setPhotoPreview(previewUrl || DEFAULT_PLACEHOLDER_IMAGE_URL);
      } else {
        setPhotoPreview(DEFAULT_PLACEHOLDER_IMAGE_URL);
      }
       if (existingStudent.className || newStudentClassName) {
        form.trigger('className');
      }
    } else {
       const resetValues = {
          name: '', fatherName: '',
          className: newStudentClassName,
          rollNumber: '',
          dobDay: '', dobMonth: '', dobYear: '', // Reset DOB fields
          address: '', contactNumber: '',
          schoolId: school?.id || '',
          photoFile: undefined,
        };
        form.reset(resetValues);
        if (newStudentClassName) {
          form.trigger('className');
        }
        setPhotoPreview(DEFAULT_PLACEHOLDER_IMAGE_URL);
    }
  }, [existingStudent, form, classNameFixed, availableClasses, school]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // ... (file change logic remains the same)
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        form.setError("photoFile", { type: "manual", message: `File too large. Max ${MAX_FILE_SIZE_MB}MB.` });
        if (existingStudent?.photoAppwriteId) {
            const previewUrl = getAppwritePreviewUrl(existingStudent.photoAppwriteId);
            setPhotoPreview(previewUrl || DEFAULT_PLACEHOLDER_IMAGE_URL);
        } else {
            setPhotoPreview(DEFAULT_PLACEHOLDER_IMAGE_URL);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      form.clearErrors("photoFile");
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('photoFile', event.target.files);
    } else { // No file selected or selection cleared
      if (existingStudent?.photoAppwriteId) {
        const previewUrl = getAppwritePreviewUrl(existingStudent.photoAppwriteId);
        setPhotoPreview(previewUrl || DEFAULT_PLACEHOLDER_IMAGE_URL);
      } else {
        setPhotoPreview(DEFAULT_PLACEHOLDER_IMAGE_URL);
      }
      form.setValue('photoFile', undefined); // Clear the file list in the form
    }
  };

  const handleRemovePhoto = async () => {
    // ... (remove photo logic remains the same)
    setPhotoPreview(DEFAULT_PLACEHOLDER_IMAGE_URL);
    form.setValue('photoFile', undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  const onSubmit = async (data: AddStudentFormSubmitValues) => { // Use output type for submitted data
    const effectiveUserIdForOperation = isAdmin && targetUserId ? targetUserId : currentUser?.uid;
    if (!effectiveUserIdForOperation) {
      toast({ variant: "destructive", title: "User Error", description: "Cannot identify user for this operation." });
      return;
    }
    if (!school || !school.id || !school.name) {
        toast({ variant: "destructive", title: "School Data Missing", description: "School information (including name) is required to save the student." });
        return;
    }

    setIsSaving(true);
    const photoFileToUpload = data.photoFile?.[0] || null;

    try {
      // Use the _validatedDateOfBirth from the transformed Zod data
      const studentDataForDb: Omit<Student, 'id' | 'userId' | 'photoAppwriteId'> = {
        name: data.name,
        fatherName: data.fatherName,
        className: data.className,
        rollNumber: data.rollNumber,
        dateOfBirth: format(data._validatedDateOfBirth, 'yyyy-MM-dd'), // Use transformed date
        address: data.address,
        contactNumber: data.contactNumber,
        schoolId: school.id,
      };

      if (existingStudent) {
        await updateStudentInContext(
            { ...studentDataForDb, id: existingStudent.id, photoAppwriteId: existingStudent.photoAppwriteId },
            photoFileToUpload,
            school.name,
            data.className,
            existingStudent.photoAppwriteId,
            targetUserId
        );
        toast({
          title: 'Student Updated',
          description: `Details for "${studentDataForDb.name}" updated.`,
        });
      } else {
        await addStudentToContext(
            studentDataForDb,
            photoFileToUpload,
            school.name,
            data.className,
            targetUserId
        );
        toast({
          title: 'Student Added',
          description: `Student "${studentDataForDb.name}" has been successfully added.`,
        });
      }

      const resetClassName = classNameFixed || (availableClasses.length > 0 ? availableClasses[0] : '');
      form.reset({
        name: '', fatherName: '',
        className: resetClassName,
        rollNumber: '',
        dobDay: '', dobMonth: '', dobYear: '', // Reset DOB fields
        address: '', contactNumber: '',
        schoolId: school.id, photoFile: undefined,
      });
      if (resetClassName) form.trigger('className');
      setPhotoPreview(DEFAULT_PLACEHOLDER_IMAGE_URL);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onStudentAddedOrUpdated();
    } catch (error) {
        console.error("Failed to save student or upload photo:", error);
         toast({
            variant: "destructive",
            title: 'Failed to Save Student',
            description: (error instanceof Error) ? error.message : 'An error occurred while saving the student or photo.',
        });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="max-h-[90vh] overflow-auto p-2 md:p-0 w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4">
          <FormField control={form.control} name="schoolId" render={({ field }) => <Input type="hidden" {...field} value={field.value || ''} />} />

          {/* Left Column */}
          <div className="space-y-4">
              <FormField
              control={form.control}
              name="name"
              // ... (Name field JSX unchanged)
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Student Name</FormLabel>
                  <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} value={field.value || ''} className="pl-10" disabled={isSaving} />
                      </FormControl>
                  </div>
                  <FormMessage />
                  </FormItem>
              )}
              />
              <FormField
              control={form.control}
              name="fatherName"
              // ... (FatherName field JSX unchanged)
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Father's Name</FormLabel>
                  <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <FormControl>
                      <Input placeholder="e.g., Richard Doe" {...field} value={field.value || ''} className="pl-10" disabled={isSaving} />
                      </FormControl>
                  </div>
                  <FormMessage />
                  </FormItem>
              )}
              />
              <FormField
              control={form.control}
              name="className"
              // ... (ClassName field JSX unchanged)
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Class</FormLabel>
                  <Select
                      onValueChange={(value) => {
                          field.onChange(value);
                          form.trigger('className');
                      }}
                      value={field.value || ''}
                      disabled={isSaving || (!!classNameFixed && !existingStudent)}
                  >
                      <div className="relative">
                      <UsersIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                      <FormControl>
                          <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select a class" />
                          </SelectTrigger>
                      </FormControl>
                      </div>
                      <SelectContent>
                      {availableClasses.map((cls) => (
                          <SelectItem key={cls} value={cls}>
                          {cls}
                          </SelectItem>
                      ))}
                      </SelectContent>
                  </Select>
                  {classNameFixed && !existingStudent && <FormDescription>Class is fixed for this entry.</FormDescription>}
                  <FormMessage />
                  </FormItem>
              )}
              />
              <FormField
              control={form.control}
              name="rollNumber"
              // ... (RollNumber field JSX unchanged)
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Roll Number</FormLabel>
                  <div className="relative">
                      <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <FormControl>
                      <Input placeholder="e.g., A101" {...field} value={field.value || ''} className="pl-10" disabled={isSaving} />
                      </FormControl>
                  </div>
                  <FormMessage />
                  </FormItem>
              )}
              />
          </div>

          {/* Right Column */}
          <div className="space-y-4">
             {/* --- Date of Birth Dropdowns --- */}
              <FormItem> {/* Grouping DOB under one label conceptually */}
                <FormLabel className="flex items-center">
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                  Date of Birth
                </FormLabel>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <FormField
                    control={form.control}
                    name="dobDay"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {days.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs px-1"/> {/* Smaller message for tight layout */}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dobMonth"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                         <FormMessage className="text-xs px-1"/>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dobYear"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                          </SelectContent>
                        </Select>
                         <FormMessage className="text-xs px-1"/>
                      </FormItem>
                    )}
                  />
                </div>
                {/* General DOB error if needed, or rely on individual field messages */}
              </FormItem>
              {/* --- End of Date of Birth Dropdowns --- */}

              <FormField
              control={form.control}
              name="contactNumber"
              // ... (ContactNumber field JSX unchanged)
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <FormControl>
                      <Input placeholder="e.g., +1 123 456 7890" {...field} value={field.value || ''} className="pl-10" disabled={isSaving} />
                      </FormControl>
                  </div>
                  <FormMessage />
                  </FormItem>
              )}
              />
              <FormField
              control={form.control}
              name="photoFile"
              // ... (PhotoFile field JSX unchanged)
              render={() => (
                  <FormItem>
                    <FormLabel>Student Photo (Max {MAX_FILE_SIZE_MB}MB)</FormLabel>
                    <div className="flex items-center gap-4">
                      {photoPreview && (
                        <NextImage
                          src={photoPreview}
                          alt="Student photo preview"
                          width={80}
                          height={80}
                          className="rounded-md object-cover aspect-square border"
                          data-ai-hint="student photo"
                          onError={() => setPhotoPreview(DEFAULT_PLACEHOLDER_IMAGE_URL)}
                        />
                      )}
                      <div className="flex-grow space-y-2">
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleFileChange}
                            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                            disabled={isSaving}
                            ref={fileInputRef}
                          />
                        </FormControl>
                         {(photoPreview && photoPreview !== DEFAULT_PLACEHOLDER_IMAGE_URL && !form.getValues('photoFile')) && (
                          <Button type="button" variant="outline" size="sm" onClick={handleRemovePhoto} disabled={isSaving}>
                              <Trash2 className="mr-2 h-4 w-4" /> Remove Photo
                          </Button>
                        )}
                      </div>
                    </div>
                    <FormDescription>
                      Upload a clear photo of the student. PNG, JPG, WEBP formats accepted.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </div>

          <FormField
            control={form.control}
            name="address"
            // ... (Address field JSX unchanged)
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Address</FormLabel>
                 <div className="relative">
                  <AddressHomeIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Textarea
                      placeholder="123 Main St, Anytown, USA"
                      className="resize-none pl-10 min-h-[80px]"
                      {...field}
                      value={field.value || ''}
                      disabled={isSaving}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full md:col-span-2 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSaving || form.formState.isSubmitting}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : (form.formState.isSubmitting ? 'Submitting...' : (existingStudent ? 'Update Student' : 'Save Student'))}
          </Button>
        </form>
      </Form>
    </div>
  );
}
