'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, Loader2, Sparkles, AlertCircle, ShoppingBag, Palette } from 'lucide-react';

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
  const errorParam = searchParams?.get('error') || '';
  const redirectTo = searchParams?.get('redirect') || searchParams?.get('next') || '';
  const initialRoleParam = searchParams?.get('role')?.toLowerCase();

  const [selectedRole, setSelectedRole] = useState<'client' | 'artist'>(
    initialRoleParam === 'artist' ? 'artist' : 'client'
  );
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [legacyError, setLegacyError] = useState(false);
  const [oauthError, setOauthError] = useState(errorParam);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  React.useEffect(() => {
    if (errorParam) {
      setOauthError(errorParam);
      toast.error('Authentication Error', {
        description: decodeURIComponent(errorParam),
        duration: 6000,
      });
    }
  }, [errorParam]);

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

        let roleToUse: 'artist' | 'client' = selectedRole === 'client' ? 'client' : 'artist';
        if (existingProfile?.role === 'artist') {
          roleToUse = 'artist';
        } else if (existingProfile?.role === 'client') {
          roleToUse = 'client';
        } else if (cleanRole === 'artist') {
          roleToUse = 'artist';
        } else if (isClient) {
          roleToUse = 'client';
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
        const dest = redirectTo || (isArtist ? '/dashboard' : '/freelancers');

        toast.success('Signed in successfully', {
          description: isArtist ? 'Redirecting to artist dashboard...' : 'Redirecting to explore artists...',
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
    setOauthError('');
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'https://vividcraft.vercel.app'}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
            role: 'client',
          },
          data: {
            role: 'client',
          },
        } as any,
      });

      if (error) {
        console.error('Google signInWithOAuth error:', error.message || error);
        throw error;
      }
    } catch (error: any) {
      console.error('handleGoogleSignIn caught error:', error);
      const message = getErrorMessage(error, 'Failed to sign in with Google.');
      setOauthError(message);
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
            {selectedRole === 'artist'
              ? 'Log in to your Artist Dashboard with email'
              : 'Sign in as a Client with Google'}
          </p>
        </div>

        {/* Dynamic Role Tabs */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('client');
              setOauthError('');
            }}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
              selectedRole === 'client'
                ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500/40 shadow-lg shadow-blue-500/15'
                : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className={`h-5 w-5 ${selectedRole === 'client' ? 'text-blue-400' : 'text-slate-400'}`} />
            <div className="text-center">
              <div className="font-semibold text-sm">Buyer / Client</div>
              <div className="text-xs text-slate-400">Google OAuth only</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole('artist');
              setOauthError('');
            }}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
              selectedRole === 'artist'
                ? 'bg-purple-600/20 border-purple-500 text-white ring-1 ring-purple-500/40 shadow-lg shadow-purple-500/15'
                : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <Palette className={`h-5 w-5 ${selectedRole === 'artist' ? 'text-purple-400' : 'text-slate-400'}`} />
            <div className="text-center">
              <div className="font-semibold text-sm">Artist / Creator</div>
              <div className="text-xs text-slate-400">Email & Password only</div>
            </div>
          </button>
        </div>

        {/* OAuth Error Alert */}
        {oauthError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 space-y-1 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-sm text-red-300">Sign-in Error</p>
                <p className="text-xs text-red-200/90 leading-relaxed">
                  {decodeURIComponent(oauthError)}
                </p>
              </div>
            </div>
          </div>
        )}

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
                href={`/auth/signup?email=${encodeURIComponent(email.trim())}&role=${selectedRole}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                Sign Up with Updated Details
              </Link>
            </div>
          </div>
        )}

        {/* Client Interface: ONLY Google OAuth */}
        {selectedRole === 'client' ? (
          <div className="space-y-6 pt-2">
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center space-y-1">
              <p className="text-xs text-blue-300 font-medium">Fast 1-Click Client Access</p>
              <p className="text-xs text-slate-400">Sign in as a Client with Google</p>
            </div>

            <button
              type="button"
              onClick={(e) => handleGoogleSignIn(e)}
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
              <span>Continue with Google</span>
            </button>
          </div>
        ) : (
          /* Artist Interface: Email & Password Only */
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
                  placeholder="artist@example.com"
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
                <button
                  type="button"
                  onClick={handlePasswordResetRequest}
                  disabled={isResettingPassword}
                  className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer disabled:opacity-50"
                >
                  {isResettingPassword ? 'Sending...' : 'Forgot password?'}
                </button>
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
              disabled={isLoading}
              className="w-full h-11 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/25"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Logging in...</span>
                </>
              ) : (
                'Log in as Artist'
              )}
            </button>
          </form>
        )}

        <div className="flex flex-col space-y-4 pt-2 border-t border-slate-800">
          <p className="text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href={`/auth/signup?role=${selectedRole}`} className="text-indigo-400 hover:text-indigo-300 hover:underline font-semibold transition-colors">
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
