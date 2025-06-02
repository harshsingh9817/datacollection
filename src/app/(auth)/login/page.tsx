
import { LoginForm } from '@/components/auth/login-form';
import { AppLogo } from '@/components/icons/AppLogo';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <AppLogo className="h-16 w-16 mb-4" />
          <h1 className="text-3xl font-bold text-center text-foreground">Welcome to Shivshakti Creation</h1>
          <p className="text-muted-foreground text-center mt-2">Sign in to manage schools and student IDs.</p>
        </div>
        <LoginForm />
         <p className="text-center text-sm text-muted-foreground">
          First <code className="bg-muted px-1 py-0.5 rounded">Take Login </code> And <code className="bg-muted px-1 py-0.5 rounded">Start</code> Your Work.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
