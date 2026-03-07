'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { analytics } from '@/utils/analytics';

function SignInContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [validationError, setValidationError] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    setIsVisible(true);

    // Pre-fill email if provided
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }

    // Show success message if redirected after email verification
    if (searchParams.get('verified') === 'true') {
      toast.success('Email verified successfully!', {
        description: 'You can now sign in to your account.'
      });
    }

    // Show message if redirected from signup because account exists
    if (searchParams.get('message') === 'account_exists') {
      toast.info('Welcome back!', {
        description: 'This account already exists. Please sign in with your password.',
        duration: 4000,
      });
    }
  }, [searchParams]);

  const handleCredentialsSignIn = async () => {
    setValidationError('');

    if (!email || !password) {
      const errorMsg = 'Please fill in all required fields';
      setValidationError(errorMsg);
      toast.error(errorMsg, {
        description: 'Email and password are both required.'
      });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errorMsg = 'Invalid email format';
      setValidationError(errorMsg);
      toast.error(errorMsg, {
        description: 'Please enter a valid email address.'
      });
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }

        toast.error('Sign in failed', {
          description: error.message || 'Invalid email or password.'
        });
        setIsLoading(false);
        return;
      }

      // Check if user account is suspended
      if (data.user) {
        const { data: fraudFlags, error: fraudError } = await supabase
          .from('FraudFlag')
          .select('*')
          .eq('userId', data.user.id)
          .eq('status', 'CONFIRMED');

        if (fraudFlags && fraudFlags.length > 0) {
          // User is suspended
          await supabase.auth.signOut();

          toast.error('Account Suspended', {
            description: 'Your account has been suspended. Please contact ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@yourdomain.com'} to appeal.',
            duration: 8000,
          });
          setIsLoading(false);
          return;
        }

        // Update lastLoginAt timestamp
        await supabase
          .from('User')
          .update({ lastLoginAt: new Date().toISOString() })
          .eq('id', data.user.id);
      }

      // Success - Supabase Auth handles email verification
      // If signInWithPassword succeeded, the email is verified
      toast.success('Signed in successfully!', {
        description: 'Redirecting to your dashboard...'
      });

      // Track successful sign in
      analytics.login('email');

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast.error('An error occurred', {
        description: 'Please try again later.'
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Main Content */}
      <div className={`w-full max-w-sm sm:max-w-md transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/jobhorizons-logo.webp"
              alt="JobHorizons"
              width={180}
              height={36}
              priority
            />
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Sign in</h1>
          <p className="text-sm sm:text-base text-gray-400">Access your account</p>
        </div>

        {/* Sign In Form */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-200 text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  className="pl-10 h-10 sm:h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg text-sm sm:text-base"
                  onKeyDown={(e) => e.key === 'Enter' && handleCredentialsSignIn()}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-200 text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  className="pl-10 pr-10 h-10 sm:h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg text-sm sm:text-base"
                  onKeyDown={(e) => e.key === 'Enter' && handleCredentialsSignIn()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div
                className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                data-testid="validation-error"
              >
                {validationError}
              </div>
            )}

            {/* Sign In Button */}
            <Button
              onClick={handleCredentialsSignIn}
              disabled={isLoading}
              data-testid="signin-button"
              className="w-full h-10 sm:h-11 bg-white text-gray-900 hover:bg-gray-100 font-medium rounded-lg transition-colors text-sm sm:text-base"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-900 rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </Button>


            {/* Sign Up Link */}
            <div className="text-center pt-6 border-t border-white/10">
              <p className="text-gray-400 text-sm">
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="text-white hover:text-gray-200 transition-colors font-medium"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 2025 JobHorizons</p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}