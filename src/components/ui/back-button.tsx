
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() => router.back()}
    >
      <ChevronLeft className="mr-2 h-4 w-4" />
      Back
    </Button>
  );
}
