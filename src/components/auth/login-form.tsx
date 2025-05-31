
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const ensureUserProfileExists = async (user: import('firebase/auth').User) => {
    if (!user) return;
    const userProfileRef = doc(db, 'user_profiles', user.uid);
    const userProfileSnap = await getDoc(userProfileRef);
    if (!userProfileSnap.exists()) {
      try {
        // If profile doesn't exist, create it.
        // user.displayName might be set if updateProfile was called during signup.
        // Otherwise, use a part of the email or a default.
        const name = user.displayName || user.email?.split('@')[0] || 'New User';
        await setDoc(userProfileRef, {
          id: user.uid,
          email: user.email,
          name: name,
        });
        console.log(`User profile created on login for ${user.email} with name: ${name}`);
      } catch (error) {
        console.error("Error creating user profile on login:", error);
      }
    }
  };


  const onSubmit = async (data: LoginFormValues) => {
    console.log('Attempting login with email:', data.email); // Logging the email
    // Special hardcoded admin email
    if (data.email.toLowerCase() === 'sunilkumarsingh817@gmail.com' && data.password === '8896As') {
      try {
        const userCredential: UserCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
        await ensureUserProfileExists(userCredential.user);
        toast({
          title: 'Admin Login Successful',
          description: 'Welcome back, Admin!',
        });
        localStorage.setItem('userEmail', data.email); 
        router.push('/dashboard');
        return;
      } catch (firebaseError: any) {
          console.error("Firebase Admin Login Error:", firebaseError);
           toast({
            variant: 'destructive',
            title: 'Admin Login Failed',
            description: firebaseError.message || 'An unexpected error occurred during admin login.',
          });
          return;
      }
    }

    // Standard Firebase authentication
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      await ensureUserProfileExists(userCredential.user);
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      localStorage.removeItem('userEmail'); 
      router.push('/dashboard');
    } catch (error: any) {
      let errorMessage = 'Invalid email or password.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many login attempts. Please try again later.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This user account has been disabled.';
      }
      console.error("Firebase Login Error:", error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
      });
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input type="email" placeholder="name@example.com" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                   <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-sm">
      </CardFooter>
    </Card>
  );
}
