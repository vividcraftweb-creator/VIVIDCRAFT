'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShoppingBag, Palette, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function RegisterForm() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedRole, setSelectedRole] = useState<'CLIENT' | 'FREELANCER'>('CLIENT');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    company: '',
    location: '',
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-2xl p-6 min-h-[420px]" />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'https://vividcraft.vercel.app'}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : `${process.env.NEXT_PUBLIC_APP_URL || 'https://vividcraft.vercel.app'}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            role: selectedRole.toLowerCase(),
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in with Google.');
      toast.error('Google Sign In Failed', {
        description: err.message || 'Failed to sign in with Google.',
      });
      setGoogleLoading(false);
    }
  };

  const handleArtistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const userCountry = formData.location?.trim() || 'Sri Lanka';
    const origin = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || 'https://vividcraft.vercel.app');

    // Ensure selectedRole strictly defaults to 'client' if not explicitly chosen as 'artist'
    const roleNormalized = (selectedRole === 'FREELANCER' || (selectedRole as string).toLowerCase() === 'artist')
      ? 'artist'
      : 'client';

    try {
      // 1. Register with Supabase Auth (strictly passing selectedRole in options.data)
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?role=${roleNormalized}`,
          data: {
            full_name: fullName,
            name: fullName,
            role: roleNormalized, // 'artist' or 'client'
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            user_type: roleNormalized,
            role_name: roleNormalized,
            userRole: roleNormalized,
            account_type: roleNormalized,
            company: formData.company?.trim() || '',
            country: userCountry,
          },
        },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('already registered') || authError.message.toLowerCase().includes('already exists') || (authError as any).code === 'user_already_exists') {
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

        console.error("SUPABASE SIGNUP ERROR:", authError.message, authError);
        setErrorMessage(authError.message);
        toast.error(`Sign up failed: ${authError.message}`);
        return;
      }

      if (data?.user && data.user.identities && data.user.identities.length === 0) {
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

      // 2. Establish live session immediately to satisfy RLS on profiles table
      let activeUserId = data?.user?.id;
      if (!data?.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });
        if (signInData?.user) {
          activeUserId = signInData.user.id;
        }
        if (signInError) {
          console.warn('[RegisterForm] signInWithPassword notice:', signInError.message);
        }
      }

      // 3. Directly update profiles table with authenticated session
      if (activeUserId) {
        try {
          const { error: profileUpdateErr } = await supabase
            .from('profiles')
            .update({
              role: roleNormalized,
              first_name: formData.firstName.trim(),
              last_name: formData.lastName.trim(),
              title: roleNormalized === 'artist' ? 'Artist' : 'Client',
              bio: roleNormalized === 'artist' ? 'Welcome to Vivid Art!' : '',
              address: userCountry,
              is_published: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeUserId);

          if (profileUpdateErr) {
            console.warn('[RegisterForm] profile update error, trying upsert:', profileUpdateErr.message);
            await supabase.from('profiles').upsert([
              {
                id: activeUserId,
                first_name: formData.firstName.trim(),
                last_name: formData.lastName.trim(),
                role: roleNormalized,
                email: formData.email.trim(),
                title: roleNormalized === 'artist' ? 'Artist' : 'Client',
                bio: roleNormalized === 'artist' ? 'Welcome to Vivid Art!' : '',
                address: userCountry,
                is_published: true,
                updated_at: new Date().toISOString(),
              },
            ], { onConflict: 'id' });
          }

          // Call provision-user endpoint to sync all tables and auth metadata
          await fetch('/api/auth/provision-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: roleNormalized,
              firstName: formData.firstName.trim(),
              lastName: formData.lastName.trim(),
              title: roleNormalized === 'artist' ? 'Artist' : 'Client',
              location: userCountry,
              country: userCountry,
            }),
          });
        } catch (profileCatchError: any) {
          console.warn('Profile upsert exception:', profileCatchError?.message || profileCatchError);
        }
      }

      toast.success('Account created successfully!', {
        description: 'Welcome to Vivid Craft! Redirecting...',
      });
      const destination = roleNormalized === 'artist' ? '/dashboard' : '/freelancers';
      window.location.replace(destination);
    } catch (err: any) {
      console.error("SUPABASE SIGNUP ERROR:", err?.message, err);
      const msg = err?.message || 'An unexpected registration error occurred.';
      setErrorMessage(msg);
      toast.error(`Sign up failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 p-6 sm:p-8 space-y-6" suppressHydrationWarning>
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
        <p className="text-sm text-slate-400" suppressHydrationWarning>
          {selectedRole === 'CLIENT'
            ? "Join as a Buyer to commission original art and explore creators"
            : "Join as an Artist to showcase and sell your artwork"}
        </p>
      </div>

      {/* Dynamic Role Tabs */}
      <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800" suppressHydrationWarning>
        <button
          type="button"
          onClick={() => {
            setSelectedRole('CLIENT');
            setErrorMessage(null);
          }}
          className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
            selectedRole === 'CLIENT'
              ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500/40 shadow-lg shadow-blue-500/15'
              : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className={`h-5 w-5 ${selectedRole === 'CLIENT' ? 'text-blue-400' : 'text-slate-400'}`} />
          <div className="text-center">
            <div className="font-semibold text-sm">Buyer / Client</div>
            <div className="text-xs text-slate-400">Quick Google access</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedRole('FREELANCER');
            setErrorMessage(null);
          }}
          className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
            selectedRole === 'FREELANCER'
              ? 'bg-purple-600/20 border-purple-500 text-white ring-1 ring-purple-500/40 shadow-lg shadow-purple-500/15'
              : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
          }`}
        >
          <Palette className={`h-5 w-5 ${selectedRole === 'FREELANCER' ? 'text-purple-400' : 'text-slate-400'}`} />
          <div className="text-center">
            <div className="font-semibold text-sm">Artist / Creator</div>
            <div className="text-xs text-slate-400">Full portfolio setup</div>
          </div>
        </button>
      </div>

      {/* View for Buyer / Client: Clean Google OAuth Only */}
      {selectedRole === 'CLIENT' ? (
        <div className="space-y-6 pt-2">
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center space-y-1">
            <p className="text-xs text-blue-300 font-medium">Fast 1-Click Client Onboarding</p>
            <p className="text-xs text-slate-400">No passwords or manual forms required for buyers.</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full h-12 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-xl shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-3 text-sm cursor-pointer"
          >
            {googleLoading ? (
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
        /* View for Artist / Creator: Full Registration Form */
        <form onSubmit={handleArtistSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-slate-200 text-xs font-medium uppercase tracking-wider">
                First Name
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="John"
                className="bg-slate-950/60 border-slate-800 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-slate-200 text-xs font-medium uppercase tracking-wider">
                Last Name
              </Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Doe"
                className="bg-slate-950/60 border-slate-800 text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-200 text-xs font-medium uppercase tracking-wider">
              Email Address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="artist@example.com"
              className="bg-slate-950/60 border-slate-800 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-200 text-xs font-medium uppercase tracking-wider">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••••••"
              className="bg-slate-950/60 border-slate-800 text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-slate-200 text-xs font-medium uppercase tracking-wider">
                Specialty / Title (Optional)
              </Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Concept Artist"
                className="bg-slate-950/60 border-slate-800 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-slate-200 text-xs font-medium uppercase tracking-wider">
                Location (Optional)
              </Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="City, Country"
                className="bg-slate-950/60 border-slate-800 text-white"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Registering Artist Account...
              </>
            ) : (
              <span className="flex items-center gap-2">
                Create Artist Account
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>

          <div className="text-center pt-4 border-t border-slate-800 text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-indigo-400 hover:text-indigo-300 underline font-medium">
              Sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}