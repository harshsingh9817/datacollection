
import { SignupForm } from '@/components/auth/signup-form';
import { AppLogo } from '@/components/icons/AppLogo';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <AppLogo className="h-16 w-16 mb-4" />
          <h1 className="text-3xl font-bold text-center text-foreground">Create an Account</h1>
          <p className="text-muted-foreground text-center mt-2">Join Shivshakti Creation to manage your institution.</p>
        </div>
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
