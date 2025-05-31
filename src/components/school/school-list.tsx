
'use client';

import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { School } from '@/lib/types';
import { Eye, SchoolIcon as PlaceholderSchoolIcon } from 'lucide-react'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { DEFAULT_PLACEHOLDER_IMAGE_URL } from '@/lib/types'; // Logo functionality removed

interface SchoolListProps {
  schools: School[];
}

export default function SchoolList({ schools }: SchoolListProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Your Schools</CardTitle>
        <CardDescription>Manage your registered educational institutions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] sm:w-[80px] hidden">Logo</TableHead> {/* Logo column remains hidden */}
              <TableHead>School Name</TableHead>
              <TableHead className="hidden sm:table-cell">Classes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.map((school) => (
              <TableRow key={school.id}>
                <TableCell className="font-medium hidden"> {/* Logo cell remains hidden */}
                  <div className="w-10 h-10 flex items-center justify-center bg-muted rounded text-muted-foreground">
                    <PlaceholderSchoolIcon size={20} /> {/* Fallback Icon */}
                  </div>
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">{school.name}</TableCell>
                <TableCell className="hidden sm:table-cell truncate max-w-xs">{school.classNames.join(', ')}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/schools/${school.id}`}>
                      <Eye className="mr-2 h-4 w-4" /> View Details
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
