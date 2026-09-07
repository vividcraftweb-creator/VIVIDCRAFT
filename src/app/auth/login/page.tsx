'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, Loader2, Sparkles, AlertCircle } from 'lucide-react';

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const err = error as Record<string, any>;
    if (typeof err.message === 'string' && err.message.trim()) return err.message;
    if (typeof err.error_description === 'string' && err.error_description.trim()) return err.error_description;
    if (typeof err.error === 'string' && err.error.trim()) return err.error;
    if (typeof err.statusText === 'string' && err.statusText.trim()) return err.statusText;
  }
  return fallback;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get('email') || '';
  const redirectTo = searchParams?.get('redirect') || searchParams?.get('next') || '';

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [legacyError, setLegacyError] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const supabase = createClient();

  const handlePasswordResetRequest = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error('Please enter your email address above first.');
      return;
    }
    setIsResettingPassword(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${origin}/auth/callback?next=/settings`,
      });
      if (error) throw error;
      toast.success('Password reset link sent!', {
        description: 'Please check your email inbox to reset your password.',
      });
    } catch (err: any) {
      toast.error('Failed to send reset email', {
        description: err?.message || 'Please try again later.',
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLegacyError(false);

    // Direct Dev Admin condition check - redirects to home page (/)
    if (email === 'vividcraftweb@gmail.com' && password === 'VividCraftAdmin#2026!') {
      document.cookie = "is_admin=true; path=/;";
      document.cookie = "mock_admin_session=true; path=/;";
      localStorage.setItem('user', JSON.stringify({ email, role: 'admin' }));
      toast.success('Signed in successfully', {
        description: 'Redirecting to home page...',
      });
      router.push('/');
      return;
    }

    if (!email.trim() || !password) {
      toast.error('Missing fields', {
        description: 'Please enter both your email address and password.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        // Ensure Clean Metadata Sync on Sign-In
        const metadata = data.user.user_metadata || {};
        const rawRole = metadata.role || metadata.userRole || '';
        const cleanRole = String(rawRole).trim().toLowerCase();
        const isClient = cleanRole === 'client' || cleanRole === 'buyer' || cleanRole === 'customer';

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        let roleToUse: 'artist' | 'client' = 'artist';
        if (existingProfile?.role === 'artist') {
          roleToUse = 'artist';
        } else if (existingProfile?.role === 'client') {
          roleToUse = 'client';
        } else {
          roleToUse = isClient ? 'client' : 'artist';
        }

        const fullName = metadata.full_name || metadata.name || '';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = metadata.first_name || metadata.firstName || nameParts[0] || (roleToUse === 'artist' ? 'New' : 'Client');
        const lastName = metadata.last_name || metadata.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '') || (roleToUse === 'artist' ? 'Artist' : 'User');
        const userLocation = metadata.location || metadata.country || 'Sri Lanka';

        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            role: roleToUse,
            email: data.user.email || null,
            address: userLocation,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        } catch (syncErr) {
          console.warn('Sign-in profiles sync notice:', syncErr);
        }

        const isArtist = roleToUse === 'artist';
        const dest = redirectTo || (isArtist ? '/dashboard' : '/');

        toast.success('Signed in successfully', {
          description: isArtist ? 'Redirecting to dashboard...' : 'Redirecting to home page...',
        });

        router.push(dest);
        router.refresh();
      }
    } catch (error: any) {
      const message = getErrorMessage(error, 'Invalid email or password. Please try again.');
      const isUnconfirmed = 
        message.toLowerCase().includes('not confirmed') ||
        message.toLowerCase().includes('unconfirmed') ||
        error?.code === 'email_not_confirmed';

      if (isUnconfirmed) {
        setLegacyError(true);
        toast.error('Legacy Account State Requires Reset', {
          description: 'This legacy account state requires resetting. Click below to reset password or sign up with updated details.',
          duration: 6000,
        });
      } else {
        toast.error('Sign in failed', {
          description: message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (e?: React.MouseEvent) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    setIsGoogleLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ''}`,
        },
      });
      
      if (error) throw error;
    } catch (error: any) {
      const message = getErrorMessage(error, 'Failed to sign in with Google.');
      toast.error('Authentication Error', {
        description: message,
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 p-6 sm:p-8 space-y-6 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-1">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-sm text-slate-400">
            Log in to access your Vivid Art account
          </p>
        </div>

        {/* Legacy Account State Alert */}
        {legacyError && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-sm text-amber-300">Action Required for Legacy Account</p>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  This legacy account state requires resetting. Click below to reset password or sign up with updated details.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handlePasswordResetRequest}
                disabled={isResettingPassword}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isResettingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Reset Password
              </button>
              <Link
                href={`/auth/signup?email=${encodeURIComponent(email.trim())}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                Sign Up with Updated Details
              </Link>
            </div>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={(e) => handleEmailSignIn(e)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-slate-200 text-sm font-medium">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-slate-200 text-sm font-medium">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all rounded-xl text-sm"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowPassword(!showPassword);
                }}
                className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Logging in...</span>
              </>
            ) : (
              'Log in with Email'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-slate-500 font-medium">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={(e) => handleGoogleSignIn(e)}
          disabled={isLoading || isGoogleLoading}
          className="w-full h-11 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all flex items-center justify-center gap-3 rounded-xl text-sm font-medium shadow-sm hover:border-slate-600 cursor-pointer"
        >
          {isGoogleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
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
          <span>Continue with Google</span>
        </button>

        <div className="flex flex-col space-y-4 pt-2 border-t border-slate-800">
          <p className="text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-indigo-400 hover:text-indigo-300 hover:underline font-semibold transition-colors">
              Sign up
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
