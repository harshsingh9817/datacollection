
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';
import { CalendarIcon, User, Hash, Cake, HomeIcon as AddressHomeIcon, Phone, Loader2, ImageUp, Trash2, Users as UsersIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Student, School } from '@/lib/types';
import { DEFAULT_PLACEHOLDER_IMAGE_URL } from '@/lib/types';
import React, { useEffect, useState, useRef } from 'react';
import { useAppState } from '@/context/AppStateContext';
import NextImage from 'next/image';
import { uploadFileToAppwriteStorage, getAppwritePreviewUrl, deleteFileFromAppwriteStorage } from '@/lib/appwrite';

const MAX_FILE_SIZE_MB = 2; 
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const studentSchemaBase = z.object({
  name: z.string().min(2, { message: 'Student name must be at least 2 characters.' }).default(''),
  fatherName: z.string().min(2, { message: "Father's name must be at least 2 characters." }).default(''),
  className: z.string().min(1, { message: 'Please select a class.' }).default(''),
  rollNumber: z.string().min(1, { message: 'Roll number is required.' }).default(''),
  dateOfBirth: z.date({ required_error: 'Date of birth is required.' }),
  address: z.string().min(5, { message: 'Address must be at least 5 characters.' }).default(''),
  contactNumber: z.string().regex(/^\+?[0-9\s-()]{7,20}$/, { message: 'Invalid contact number format.' }).default(''),
  schoolId: z.string().default(''), 
  photoFile: z.custom<FileList>().optional(),
});

const studentSchema = studentSchemaBase.refine(
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

type AddStudentFormValues = z.infer<typeof studentSchema>;

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

  const form = useForm<AddStudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: '',
      fatherName: '',
      className: defaultSelectedClass,
      rollNumber: '',
      dateOfBirth: undefined, 
      address: '',
      contactNumber: '',
      schoolId: school?.id || '',
      photoFile: undefined,
    },
  });

 useEffect(() => {
    const newStudentClassName = classNameFixed || (availableClasses.length > 0 ? availableClasses[0] : '');
    if (existingStudent) {
      const dob = existingStudent.dateOfBirth && isValid(parse(existingStudent.dateOfBirth, 'yyyy-MM-dd', new Date()))
                  ? parse(existingStudent.dateOfBirth, 'yyyy-MM-dd', new Date())
                  : undefined; 
      form.reset({
        name: existingStudent.name || '',
        fatherName: existingStudent.fatherName || '',
        className: existingStudent.className || newStudentClassName,
        rollNumber: existingStudent.rollNumber || '',
        address: existingStudent.address || '',
        contactNumber: existingStudent.contactNumber || '',
        schoolId: existingStudent.schoolId || school?.id || '',
        dateOfBirth: dob,
        photoFile: undefined, // Reset photoFile field on load
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
    } else { // New student
       const resetValues = {
          name: '',
          fatherName: '',
          className: newStudentClassName,
          rollNumber: '',
          dateOfBirth: undefined,
          address: '',
          contactNumber: '',
          schoolId: school?.id || '',
          photoFile: undefined,
        };
        form.reset(resetValues);
        if (newStudentClassName) { // If a class is auto-selected
          form.trigger('className'); 
        }
        setPhotoPreview(DEFAULT_PLACEHOLDER_IMAGE_URL);
    }
  }, [existingStudent, form, classNameFixed, availableClasses, school]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
    setPhotoPreview(DEFAULT_PLACEHOLDER_IMAGE_URL);
    form.setValue('photoFile', undefined); 
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
    // The existingStudent.photoAppwriteId will be used by onSubmit to know if an old photo needs deletion
    // if no new photoFile is provided.
  };


  const onSubmit = async (data: AddStudentFormValues) => {
    const effectiveUserIdForOperation = isAdmin && targetUserId ? targetUserId : currentUser?.uid;
    if (!effectiveUserIdForOperation) {
      toast({ variant: "destructive", title: "User Error", description: "Cannot identify user for this operation." });
      return;
    }
    if (!school || !school.id || !school.name) { // Ensure school.name is available for path construction
        toast({ variant: "destructive", title: "School Data Missing", description: "School information (including name) is required to save the student." });
        return;
    }

    setIsSaving(true);
    const photoFileToUpload = data.photoFile?.[0] || null;

    try {
      const studentDataForDb: Omit<Student, 'id' | 'userId' | 'photoAppwriteId'> = {
        name: data.name,
        fatherName: data.fatherName,
        className: data.className,
        rollNumber: data.rollNumber,
        dateOfBirth: format(data.dateOfBirth, 'yyyy-MM-dd'),
        address: data.address,
        contactNumber: data.contactNumber,
        schoolId: school.id,
      };

      if (existingStudent) {
        await updateStudentInContext(
            { ...studentDataForDb, id: existingStudent.id, photoAppwriteId: existingStudent.photoAppwriteId }, 
            photoFileToUpload,
            school.name, // Pass schoolNameForPath
            data.className, // Pass classNameForPath - using current class from form
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
            school.name, // Pass schoolNameForPath
            data.className, // Pass classNameForPath - using current class from form
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
        rollNumber: '', dateOfBirth: undefined, address: '', contactNumber: '',
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4">
        <FormField control={form.control} name="schoolId" render={({ field }) => <Input type="hidden" {...field} value={field.value || ''} />} />
        
        <div className="space-y-4"> 
            <FormField
            control={form.control}
            name="name"
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

        <div className="space-y-4"> 
            <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Date of Birth</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                        <FormControl>
                        <Button
                            variant={'outline'}
                            className={cn(
                            'w-full pl-10 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                            )}
                            disabled={isSaving} type="button"
                        >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        </Button>
                        </FormControl>
                    </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="contactNumber"
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
  );
}
