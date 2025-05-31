
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Building, Loader2 } from 'lucide-react';
import AddSchoolForm from '@/components/school/add-school-form';
import SchoolList from '@/components/school/school-list';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useAppState } from '@/context/AppStateContext';

export default function SchoolsPage() {
  const { schools, isLoading, currentUser } = useAppState();
  const [isAddSchoolDialogOpen, setIsAddSchoolDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading schools...</p>
      </div>
    );
  }
  
  // Handles both Firebase auth and local admin (where currentUser might be null but local admin string exists)
  const effectiveUser = currentUser || (localStorage.getItem('userEmail') === 'sunilkumarsingh817@gmail.com' ? 'local_admin' : null);

  if (!effectiveUser && !isLoading) {
     return (
      <div className="flex h-full w-full flex-col items-center justify-center p-12 text-center">
        <Building className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold">Authentication Required</h3>
        <p className="text-muted-foreground">Please log in to manage schools.</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schools</h1>
          <p className="text-muted-foreground">Manage all educational institutions.</p>
        </div>
        <Dialog open={isAddSchoolDialogOpen} onOpenChange={setIsAddSchoolDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add School
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New School</DialogTitle>
              <DialogDescription>
                Enter the details for the new school. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <AddSchoolForm 
              onSchoolAdded={() => {
                setIsAddSchoolDialogOpen(false);
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {schools.length > 0 ? (
        <SchoolList schools={schools} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center shadow-sm">
          <Building className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold">No schools added yet</h3>
          <p className="mt-2 mb-4 text-sm text-muted-foreground">
            Get started by adding your first school.
          </p>
          <Button onClick={() => setIsAddSchoolDialogOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Add School
          </Button>
        </div>
      )}
    </div>
  );
}
