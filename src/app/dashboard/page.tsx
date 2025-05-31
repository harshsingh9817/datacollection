
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Building, Users, BookOpenCheck, Loader2 } from 'lucide-react';
import { useAppState } from '@/context/AppStateContext';

export default function DashboardPage() {
  const { schools, students, isLoading } = useAppState();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Shivshakti Creation. Manage your schools, classes, and student IDs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2"> {/* Adjusted grid to 2 cols */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <Building className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schools.length}</div>
            <p className="text-xs text-muted-foreground">
              Manage all registered schools.
            </p>
            <Button asChild size="sm" className="mt-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/dashboard/schools">View Schools</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ID Card Generation</CardTitle>
            <BookOpenCheck className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AI Powered</div>
            <p className="text-xs text-muted-foreground">
              Generate professional ID cards.
            </p>
            <Button 
              asChild 
              size="sm" 
              variant="outline" 
              className="mt-4 w-full border-accent text-accent hover:bg-accent/10"
              disabled={schools.length === 0} // Disable if no schools
            >
               <Link href={schools.length > 0 && schools[0]?.classNames?.length > 0 ? `/dashboard/schools/${schools[0]?.id}/classes/${encodeURIComponent(schools[0]?.classNames[0])}` : (schools.length > 0 ? `/dashboard/schools/${schools[0]?.id}` : '#')}>
                Start Generating
               </Link>
            </Button>
             {schools.length > 0 && schools[0]?.classNames?.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">Add classes to a school to start generating IDs.</p>
            )}
            {schools.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">Add a school first to enable ID generation.</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {schools.length === 0 && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Add your first school to begin managing classes and students.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/dashboard/schools">Add New School</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
