
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { School } from '@/lib/types'; 
import { PREDEFINED_CLASSES } from '@/lib/types';
import { SchoolIcon as BuildingIcon, Loader2 } from 'lucide-react'; // Removed DatabaseZap
import { useAppState } from '@/context/AppStateContext';
import React, { useState } from 'react';

const schoolSchema = z.object({
  name: z.string().min(2, { message: 'School name must be at least 2 characters.' }),
  // appwriteBucketId field removed
  selectedClasses: z.array(z.string()).min(1, { message: 'Please select at least one class.' }),
});

type AddSchoolFormValues = z.infer<typeof schoolSchema>;

interface AddSchoolFormProps {
  onSchoolAdded: () => void;
  targetUserId?: string; 
}

export default function AddSchoolForm({ onSchoolAdded, targetUserId }: AddSchoolFormProps) {
  const { toast } = useToast();
  const { addSchool: addSchoolToContext, currentUser, isAdmin } = useAppState();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<AddSchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: '',
      // appwriteBucketId: '', // Removed
      selectedClasses: [],
    },
  });

  const onSubmit = async (data: AddSchoolFormValues) => {    
    const actingUser = currentUser;
    if (!actingUser && !isAdmin) { // Admin might act without being the target user
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
      return;
    }
    setIsSaving(true);

    const effectiveUserIdForOperation = isAdmin && targetUserId ? targetUserId : (actingUser?.uid || '');
    if (!effectiveUserIdForOperation) {
      toast({ variant: "destructive", title: "User Error", description: "Cannot determine user for operation." });
      setIsSaving(false);
      return;
    }


    try {
      const newSchoolData: Omit<School, 'id' | 'userId'> = {
        name: data.name,
        // appwriteBucketId: data.appwriteBucketId, // Removed
        classNames: data.selectedClasses,
      };
      
      await addSchoolToContext(newSchoolData, isAdmin && targetUserId ? targetUserId : undefined);
      
      toast({
        title: 'School Added',
        description: `School "${data.name}" has been successfully added for user ID ${effectiveUserIdForOperation}.`,
      });
      form.reset();
      onSchoolAdded(); 
    } catch (error) {
      console.error("Failed to add school:", error);
      toast({
        variant: "destructive",
        title: 'Failed to Add School',
        description: (error instanceof Error) ? error.message : 'An error occurred while saving the school.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>School Name</FormLabel>
              <div className="relative">
                <BuildingIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="e.g., Springfield High" {...field} className="pl-10" disabled={isSaving} />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Appwrite Bucket ID input field removed */}

        <FormField
          control={form.control}
          name="selectedClasses"
          render={() => (
            <FormItem>
              <FormLabel>Select Available Classes</FormLabel>
              <FormDescription>
                Choose all classes offered by this school.
              </FormDescription>
              <ScrollArea className="h-48 rounded-md border p-4">
                <div className="space-y-2">
                  {PREDEFINED_CLASSES.map((className) => (
                    <FormField
                      key={className}
                      control={form.control}
                      name="selectedClasses"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(className)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, className])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== className
                                      )
                                    )
                              }}
                              disabled={isSaving}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {className}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </ScrollArea>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSaving || form.formState.isSubmitting}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isSaving ? 'Saving...' : (form.formState.isSubmitting ? 'Submitting...' : 'Save School')}
        </Button>
      </form>
    </Form>
  );
}
