'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import Link from 'next/link';
import { Mail, Lock, User, Eye, EyeOff, Loader2, Palette, ShoppingBag, Sparkles, ArrowRight } from 'lucide-react';


export default function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRole = searchParams?.get('role')?.toLowerCase();
  const initialRole: 'CLIENT' | 'FREELANCER' = (queryRole === 'client' || queryRole === 'buyer') ? 'CLIENT' : 'FREELANCER';

  const [role, setRole] = useState<'CLIENT' | 'FREELANCER'>(initialRole);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    title: '',
    location: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGoogleSignUp = async (roleOverride?: 'CLIENT' | 'FREELANCER') => {
    const roleToUse = roleOverride || role || 'FREELANCER';
    const normalizedParam = roleToUse === 'CLIENT' ? 'client' : 'artist';
    setIsGoogleLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const origin = typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL || 'https://vividcraft.vercel.app');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?role=${encodeURIComponent(normalizedParam)}`,
          queryParams: { role: normalizedParam },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in with Google.');
      toast.error('Google Sign In Failed', {
        description: err.message || 'Failed to sign in with Google.',
      });
      setIsGoogleLoading(false);
    }
  };

  const validate = (): string | null => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.email.trim()) return 'Email address is required';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 12) {
      return 'Password must be at least 12 characters long';
    }
    if (!/[A-Z]/.test(formData.password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(formData.password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(formData.password)) {
      return 'Password must contain at least one number';
    }
    if (!/[^A-Za-z0-9]/.test(formData.password)) {
      return 'Password must contain at least one special character';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleArtistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      toast.error('Validation Error', {
        description: validationError,
      });
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const userCountry = formData.location?.trim() || 'Sri Lanka';

    try {
      // Call the signup API route which creates auth user + User + Profile records atomically
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          role: 'artist',
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          title: formData.title?.trim() || undefined,
          location: userCountry,
          country: userCountry,
        }),
      });

      const responseData = await res.json();

      // Explicitly check for user already exists (409 status or flags)
      const isAlreadyRegistered = 
        res.status === 409 || 
        responseData.userExists || 
        responseData.error === 'user_already_exists' || 
        responseData.message?.toLowerCase().includes('already exists') || 
        responseData.message?.toLowerCase().includes('already registered');

      if (isAlreadyRegistered) {
        const existMsg = 'An account with this email already exists. Please Sign In.';
        setErrorMessage(existMsg);
        toast.error('Account already exists', {
          description: existMsg,
          duration: 4000,
        });
        setTimeout(() => {
          router.push(`/auth/login?email=${encodeURIComponent(formData.email.trim())}`);
        }, 1500);
        return;
      }

      if (!res.ok) {
        // Handle specific error cases
        if (res.status === 429) {
          setErrorMessage(responseData.message || 'Too many signup attempts. Please try again later.');
          toast.error('Rate Limited', {
            description: responseData.message,
          });
          return;
        }

        throw new Error(responseData.message || 'Signup failed');
      }

      // Handle Successful Auto-Sign-Up (Verification Off):
      // Log the user in to establish client session immediately
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      // Synchronize metadata to profiles table directly
      if (signInData?.user) {
        try {
          await supabase.from('profiles').upsert({
            id: signInData.user.id,
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            role: 'artist',
            email: formData.email.trim(),
            title: formData.title?.trim() || 'Artist',
            bio: 'Welcome to Vivid Art!',
            location: userCountry,
            address: userCountry,
            is_published: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        } catch (syncErr) {
          console.warn('Post-signup profiles sync note:', syncErr);
        }
      }

      toast.success('Account created successfully!', {
        description: 'Welcome to Vivid Craft! Redirecting to dashboard...',
      });

      router.push('/dashboard');
    } catch (err: any) {
      console.error("SIGNUP ERROR:", err?.message, err);
      const msg = err?.message || 'An unexpected registration error occurred.';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        const existMsg = 'An account with this email already exists. Please Sign In.';
        setErrorMessage(existMsg);
        toast.error('Account already exists', {
          description: existMsg,
          duration: 4000,
        });
        setTimeout(() => {
          router.push(`/auth/login?email=${encodeURIComponent(formData.email.trim())}`);
        }, 1500);
        return;
      }
      setErrorMessage(msg);
      toast.error(`Sign up failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4 py-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 p-6 sm:p-8 space-y-6 relative z-10">
        
        {/* Show Error Banner if any */}
        {errorMessage && (
          <div className="p-3 text-sm text-red-400 bg-red-950/50 border border-red-500/30 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Show Success Banner */}
        {successMessage && (
          <div className="p-4 text-sm text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 rounded-lg text-center space-y-3">
            <p>{successMessage}</p>
            <Link href="/auth/signin" className="inline-block text-indigo-400 hover:text-indigo-300 underline font-medium">
              Proceed to Sign in
            </Link>
          </div>
        )}
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-1">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Create an Account
          </h1>
          <p className="text-sm text-slate-400">
            {role === 'CLIENT'
              ? 'Join as a Buyer to commission original art and explore creators'
              : 'Join as an Artist to showcase and sell your artwork'}
          </p>
        </div>

        {/* Dynamic Role Tabs */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setRole('CLIENT');
              setErrorMessage(null);
            }}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
              role === 'CLIENT'
                ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500/40 shadow-lg shadow-blue-500/15'
                : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className={`h-5 w-5 ${role === 'CLIENT' ? 'text-blue-400' : 'text-slate-400'}`} />
            <div className="text-center">
              <div className="font-semibold text-sm">Buyer / Client</div>
              <div className="text-xs text-slate-400">Quick Google access</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('FREELANCER');
              setErrorMessage(null);
            }}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
              role === 'FREELANCER'
                ? 'bg-purple-600/20 border-purple-500 text-white ring-1 ring-purple-500/40 shadow-lg shadow-purple-500/15'
                : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <Palette className={`h-5 w-5 ${role === 'FREELANCER' ? 'text-purple-400' : 'text-slate-400'}`} />
            <div className="text-center">
              <div className="font-semibold text-sm">Artist / Creator</div>
              <div className="text-xs text-slate-400">Full portfolio setup</div>
            </div>
          </button>
        </div>

        {/* View for Buyer / Client: Clean Google OAuth Only */}
        {role === 'CLIENT' ? (
          <div className="space-y-6 pt-2">
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center space-y-1">
              <p className="text-xs text-blue-300 font-medium">Fast 1-Click Client Onboarding</p>
              <p className="text-xs text-slate-400">No passwords or manual forms required for buyers.</p>
            </div>

            <button
              type="button"
              onClick={() => handleGoogleSignUp('CLIENT')}
              disabled={isGoogleLoading}
              className="w-full h-12 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-xl shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-3 text-sm cursor-pointer"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-900" />
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span>Sign up with Google</span>
            </button>
          </div>
        ) : (
          /* View for Artist / Creator: Full Registration Form */
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => handleGoogleSignUp('FREELANCER')}
              disabled={isGoogleLoading || isLoading}
              className="w-full h-12 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-xl shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-3 text-sm cursor-pointer"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-900" />
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span>Continue with Google as Artist</span>
            </button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-3 text-slate-500 font-medium">
                  Or register with email
                </span>
              </div>
            </div>

            <form onSubmit={handleArtistSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="block text-slate-200 text-xs font-medium uppercase tracking-wider">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="lastName" className="block text-slate-200 text-xs font-medium uppercase tracking-wider">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-slate-200 text-xs font-medium uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="artist@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-slate-200 text-xs font-medium uppercase tracking-wider">
                Password (min. 12 characters, uppercase, number & symbol)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-10 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-slate-200 text-xs font-medium uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-10 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="title" className="block text-slate-200 text-xs font-medium uppercase tracking-wider">
                  Specialty / Title (Optional)
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="Concept Artist & Painter"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="location" className="block text-slate-200 text-xs font-medium uppercase tracking-wider">
                  Location (Optional)
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all rounded-xl text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Registering Artist Account...</span>
                </>
              ) : (
                <span className="flex items-center gap-2">
                  Create Artist Account
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
            </form>
          </div>
        )}

        {/* Sign In Link */}
        <div className="flex flex-col space-y-4 pt-4 border-t border-slate-800">
          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-indigo-400 hover:text-indigo-300 hover:underline font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}