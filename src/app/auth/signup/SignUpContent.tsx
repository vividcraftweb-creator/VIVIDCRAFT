'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import Link from 'next/link';
import { Mail, Lock, User, Eye, EyeOff, Loader2, Palette, ShoppingBag, Sparkles, ArrowRight, Check } from 'lucide-react';
import {
  ARTIST_MEDIUMS,
  ARTIST_SPECIALTIES,
  ARTIST_SERVICES,
  validateArtistCategories,
} from '@/lib/artist-categories';

export default function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRole = searchParams?.get('role')?.toLowerCase();
  const initialRoleParam: 'client' | 'artist' = (queryRole === 'artist' || queryRole === 'freelancer') ? 'artist' : 'client';

  const [selectedRole, setSelectedRole] = useState<'client' | 'artist'>(initialRoleParam);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Artist categories states
  const [selectedMediums, setSelectedMediums] = useState<string[]>([]);
  const [otherMedium, setOtherMedium] = useState<string>('');
  const [showOtherMedium, setShowOtherMedium] = useState<boolean>(false);

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [otherSpecialty, setOtherSpecialty] = useState<string>('');
  const [showOtherSpecialty, setShowOtherSpecialty] = useState<boolean>(false);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [otherService, setOtherService] = useState<string>('');
  const [showOtherService, setShowOtherService] = useState<boolean>(false);

  const toggleMedium = (item: string) => {
    setSelectedMediums((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const toggleSpecialty = (item: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const toggleService = (item: string) => {
    setSelectedServices((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

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

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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
    } catch (err: any) {
      console.error('handleGoogleSignUp caught error:', err);
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

    // Main category validations for Artist
    if (selectedRole === 'artist') {
      const catCheck = validateArtistCategories(
        selectedMediums,
        showOtherMedium ? otherMedium : '',
        selectedSpecialties,
        showOtherSpecialty ? otherSpecialty : '',
        selectedServices,
        showOtherService ? otherService : ''
      );
      if (!catCheck.isValid) {
        return catCheck.error;
      }
      if (showOtherMedium && !otherMedium.trim()) {
        return 'Please specify your custom Medium / Art Style in the input field, or uncheck Other.';
      }
      if (showOtherSpecialty && !otherSpecialty.trim()) {
        return 'Please specify your custom Specialty / Art Type in the input field, or uncheck Other.';
      }
      if (showOtherService && !otherService.trim()) {
        return 'Please specify your custom Service Offered in the input field, or uncheck Other.';
      }
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
    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();

    // Prepare consolidated category arrays
    const finalMediums = [
      ...selectedMediums,
      ...(showOtherMedium && otherMedium.trim() ? [otherMedium.trim()] : []),
    ];
    const finalSpecialties = [
      ...selectedSpecialties,
      ...(showOtherSpecialty && otherSpecialty.trim() ? [otherSpecialty.trim()] : []),
    ];
    const finalServices = [
      ...selectedServices,
      ...(showOtherService && otherService.trim() ? [otherService.trim()] : []),
    ];
    const finalOtherCategories = [
      ...(showOtherMedium && otherMedium.trim() ? [otherMedium.trim()] : []),
      ...(showOtherSpecialty && otherSpecialty.trim() ? [otherSpecialty.trim()] : []),
      ...(showOtherService && otherService.trim() ? [otherService.trim()] : []),
    ];

    // Store in localStorage for persistent WhatsApp verification flow
    try {
      localStorage.setItem('vividcraft_artist_categories', JSON.stringify({
        art_styles: finalMediums,
        art_specialties: finalSpecialties,
        services_offered: finalServices,
        mediums: finalMediums,
        specialties: finalSpecialties,
        services: finalServices,
        other_categories: finalOtherCategories,
      }));
    } catch {}

    // Artist Sign-Up strictly uses 'artist' role
    const selectedRole = 'artist';

    try {
      const origin = typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL || 'https://vividcraft.vercel.app');

      // STEP 1: Register with Supabase Auth — strictly passing selectedRole and categories in options.data
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?role=${selectedRole}`,
          data: {
            full_name: fullName,
            name: fullName,
            role: selectedRole, // 'artist' or 'client'
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            user_type: selectedRole,
            userRole: selectedRole,
            role_name: selectedRole,
            account_type: selectedRole,
            location: userCountry,
            country: userCountry,
            art_styles: finalMediums,
            art_specialties: finalSpecialties,
            services_offered: finalServices,
            mediums: finalMediums,
            specialties: finalSpecialties,
            services: finalServices,
            other_categories: finalOtherCategories,
          },
        },
      });

      // Handle user already exists (Supabase returns 0 identities or explicit error)
      const isAlreadyExists =
        (authError && (
          authError.message.toLowerCase().includes('already registered') ||
          authError.message.toLowerCase().includes('already exists') ||
          (authError as any).code === 'user_already_exists'
        )) ||
        (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);

      if (isAlreadyExists) {
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

      if (authError) {
        throw authError;
      }

      // STEP 2: Handle session state gracefully
      if (!data?.session) {
        if (data?.user?.id) {
          try {
            await fetch('/api/auth/provision-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: data.user.id,
                email: formData.email.trim(),
                role: selectedRole,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                title: formData.title?.trim() || (selectedRole === 'artist' ? 'Artist' : 'Client'),
                location: userCountry,
                country: userCountry,
                art_styles: finalMediums,
                art_specialties: finalSpecialties,
                services_offered: finalServices,
                mediums: finalMediums,
                specialties: finalSpecialties,
                services: finalServices,
                other_categories: finalOtherCategories,
              }),
            });
          } catch {}
        }

        toast.success('Account created successfully!', {
          description: 'Please sign in to your account to continue.',
          duration: 4000,
        });
        setSuccessMessage('Account created successfully! Redirecting to sign in...');
        setTimeout(() => {
          router.push(`/auth/login?email=${encodeURIComponent(formData.email.trim())}`);
        }, 1500);
        return;
      }

      // STEP 2.5: Live session is present, directly update the profiles table
      const activeUserId = data.session.user.id;
      if (activeUserId) {
        const fullProfilePayload: any = {
          role: selectedRole,
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          title: selectedRole === 'artist' ? (formData.title?.trim() || 'Artist') : 'Client',
          bio: selectedRole === 'artist' ? 'Welcome to Vivid Art!' : '',
          address: userCountry,
          art_styles: finalMediums,
          art_specialties: finalSpecialties,
          services_offered: finalServices,
          mediums: finalMediums,
          specialties: finalSpecialties,
          services: finalServices,
          other_categories: finalOtherCategories,
          skills: [...finalMediums, ...finalSpecialties],
          updated_at: new Date().toISOString(),
        };

        try {
          const { error: profileUpdateErr } = await supabase
            .from('profiles')
            .update(fullProfilePayload)
            .eq('id', activeUserId);

          if (profileUpdateErr) {
            console.warn('[signup] Direct profile update notice, attempting upsert:', profileUpdateErr.message);
            const { error: upsertErr } = await supabase.from('profiles').upsert({
              id: activeUserId,
              ...fullProfilePayload,
              email: formData.email.trim(),
            }, { onConflict: 'id' });

            if (upsertErr) {
              console.warn('[signup] Fallback to basic profile upsert without categories:', upsertErr.message);
              await supabase.from('profiles').upsert({
                id: activeUserId,
                role: selectedRole,
                email: formData.email.trim(),
                first_name: formData.firstName.trim(),
                last_name: formData.lastName.trim(),
                title: selectedRole === 'artist' ? (formData.title?.trim() || 'Artist') : 'Client',
                bio: selectedRole === 'artist' ? 'Welcome to Vivid Art!' : '',
                address: userCountry,
                art_styles: finalMediums,
                art_specialties: finalSpecialties,
                services_offered: finalServices,
                mediums: finalMediums,
                specialties: finalSpecialties,
                services: finalServices,
                skills: [...finalMediums, ...finalSpecialties],
                updated_at: new Date().toISOString(),
              }, { onConflict: 'id' });
            }
          }
        } catch (profileErr: any) {
          console.warn('[signup] Profile update catch, fallback to basic update:', profileErr);
          try {
            await supabase.from('profiles').update({
              role: selectedRole,
              first_name: formData.firstName.trim(),
              last_name: formData.lastName.trim(),
              title: selectedRole === 'artist' ? (formData.title?.trim() || 'Artist') : 'Client',
              address: userCountry,
              art_styles: finalMediums,
              art_specialties: finalSpecialties,
              services_offered: finalServices,
              mediums: finalMediums,
              specialties: finalSpecialties,
              services: finalServices,
              skills: [...finalMediums, ...finalSpecialties],
              updated_at: new Date().toISOString(),
            }).eq('id', activeUserId);
          } catch {}
        }
      }

      // STEP 3: Call /api/auth/provision-user to sync all DB tables and user_metadata
      try {
        await fetch('/api/auth/provision-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: selectedRole,
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            title: formData.title?.trim() || (selectedRole === 'artist' ? 'Artist' : 'Client'),
            location: userCountry,
            country: userCountry,
            art_styles: finalMediums,
            art_specialties: finalSpecialties,
            services_offered: finalServices,
            mediums: finalMediums,
            specialties: finalSpecialties,
            services: finalServices,
            other_categories: finalOtherCategories,
          }),
        });
      } catch (provisionErr) {
        console.warn('[signup] provision-user API notice:', provisionErr);
      }

      toast.success('Account created successfully!', {
        description: selectedRole === 'artist'
          ? 'Welcome to Vivid Craft! Please verify your account via WhatsApp...'
          : 'Welcome to Vivid Craft! Redirecting to explore artists...',
      });

      // STEP 4: Hard redirect to destination.
      // Artists must complete WhatsApp verification before accessing the dashboard.
      const destination = selectedRole === 'artist' ? '/verify-whatsapp' : '/freelancers';
      window.location.replace(destination);
    } catch (err: any) {
      console.error('SIGNUP ERROR:', err?.message, err);
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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className={`w-full ${selectedRole === 'artist' ? 'max-w-2xl' : 'max-w-lg'} bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 p-6 sm:p-8 space-y-6 relative z-10 transition-all duration-300`}>
        
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
            <Link href="/auth/signin" className="inline-block text-amber-400 hover:text-amber-300 underline font-medium">
              Proceed to Sign in
            </Link>
          </div>
        )}
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-1">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Create an Account
          </h1>
          <p className="text-sm text-slate-400">
            {selectedRole === 'client'
              ? 'Sign in as a Client with Google'
              : 'Join as an Artist to showcase and sell your artwork'}
          </p>
        </div>

        {/* Dynamic Role Tabs */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('client');
              setErrorMessage(null);
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
              setErrorMessage(null);
            }}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
              selectedRole === 'artist'
                ? 'bg-amber-500/15 border-amber-500 text-amber-300 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/15'
                : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <Palette className={`h-5 w-5 ${selectedRole === 'artist' ? 'text-amber-400' : 'text-slate-400'}`} />
            <div className="text-center">
              <div className="font-semibold text-sm">Artist / Creator</div>
              <div className="text-xs text-slate-400">Email & Password only</div>
            </div>
          </button>
        </div>

        {/* View for Buyer / Client: Clean Google OAuth Only */}
        {selectedRole === 'client' ? (
          <div className="space-y-6 pt-2">
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center space-y-1">
              <p className="text-xs text-blue-300 font-medium">Fast 1-Click Client Onboarding</p>
              <p className="text-xs text-slate-400">Sign in as a Client with Google</p>
            </div>

            <button
              type="button"
              onClick={() => handleGoogleSignUp()}
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
          /* View for Artist / Creator: Full Registration Form (Email & Password Only) */
          <div className="space-y-4">
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
                    className="w-full pl-10 pr-4 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all rounded-xl text-sm"
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
                  className="w-full px-4 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all rounded-xl text-sm"
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
                  className="w-full pl-10 pr-4 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all rounded-xl text-sm"
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
                  className="w-full pl-10 pr-10 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all rounded-xl text-sm"
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
                  className="w-full pl-10 pr-10 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all rounded-xl text-sm"
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
                  className="w-full px-4 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all rounded-xl text-sm"
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
                  className="w-full px-4 h-11 bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Category Selections Section */}
            <div className="space-y-4 pt-3 border-t border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-amber-400" />
                    Artist Categories & Services
                  </h3>
                  <span className="text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Required
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Select all that apply to help buyers discover your work. You can select unlimited items.
                </p>
              </div>

              {/* 1. Medium / Art Style */}
              <div className="space-y-2 p-3 bg-slate-950/40 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    1. Medium / Art Style <span className="text-amber-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {selectedMediums.length + (showOtherMedium && otherMedium.trim() ? 1 : 0)} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {ARTIST_MEDIUMS.map((medium) => {
                    const isSelected = selectedMediums.includes(medium);
                    return (
                      <button
                        type="button"
                        key={medium}
                        onClick={() => toggleMedium(medium)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/10'
                            : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${isSelected ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold' : 'border-slate-700 bg-slate-800'}`}>
                          {isSelected ? '✓' : ''}
                        </span>
                        {medium}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setShowOtherMedium(!showOtherMedium)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      showOtherMedium
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/10'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${showOtherMedium ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold' : 'border-slate-700 bg-slate-800'}`}>
                      {showOtherMedium ? '✓' : ''}
                    </span>
                    Other
                  </button>
                </div>
                {showOtherMedium && (
                  <div className="pt-1.5">
                    <input
                      type="text"
                      placeholder="Specify custom medium / art style (e.g., Resin Art, Spray Paint)..."
                      value={otherMedium}
                      onChange={(e) => setOtherMedium(e.target.value)}
                      className="w-full px-3 h-9 bg-slate-950 border border-amber-500/40 text-white placeholder:text-slate-500 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all"
                    />
                  </div>
                )}
              </div>

              {/* 2. Specialty / Art Type */}
              <div className="space-y-2 p-3 bg-slate-950/40 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    2. Specialty / Art Type <span className="text-amber-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {selectedSpecialties.length + (showOtherSpecialty && otherSpecialty.trim() ? 1 : 0)} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {ARTIST_SPECIALTIES.map((spec) => {
                    const isSelected = selectedSpecialties.includes(spec);
                    return (
                      <button
                        type="button"
                        key={spec}
                        onClick={() => toggleSpecialty(spec)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/10'
                            : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${isSelected ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold' : 'border-slate-700 bg-slate-800'}`}>
                          {isSelected ? '✓' : ''}
                        </span>
                        {spec}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setShowOtherSpecialty(!showOtherSpecialty)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      showOtherSpecialty
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/10'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${showOtherSpecialty ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold' : 'border-slate-700 bg-slate-800'}`}>
                      {showOtherSpecialty ? '✓' : ''}
                    </span>
                    Other
                  </button>
                </div>
                {showOtherSpecialty && (
                  <div className="pt-1.5">
                    <input
                      type="text"
                      placeholder="Specify custom specialty / art type (e.g., Cyberpunk, Fantasy Portraits)..."
                      value={otherSpecialty}
                      onChange={(e) => setOtherSpecialty(e.target.value)}
                      className="w-full px-3 h-9 bg-slate-950 border border-amber-500/40 text-white placeholder:text-slate-500 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all"
                    />
                  </div>
                )}
              </div>

              {/* 3. Service Offered */}
              <div className="space-y-2 p-3 bg-slate-950/40 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    3. Service Offered <span className="text-amber-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {selectedServices.length + (showOtherService && otherService.trim() ? 1 : 0)} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {ARTIST_SERVICES.map((serv) => {
                    const isSelected = selectedServices.includes(serv);
                    return (
                      <button
                        type="button"
                        key={serv}
                        onClick={() => toggleService(serv)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/10'
                            : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${isSelected ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold' : 'border-slate-700 bg-slate-800'}`}>
                          {isSelected ? '✓' : ''}
                        </span>
                        {serv}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setShowOtherService(!showOtherService)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      showOtherService
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/10'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${showOtherService ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold' : 'border-slate-700 bg-slate-800'}`}>
                      {showOtherService ? '✓' : ''}
                    </span>
                    Other
                  </button>
                </div>
                {showOtherService && (
                  <div className="pt-1.5">
                    <input
                      type="text"
                      placeholder="Specify custom service offered (e.g., Album Art, Live Wedding Sketching)..."
                      value={otherService}
                      onChange={(e) => setOtherService(e.target.value)}
                      className="w-full px-3 h-9 bg-slate-950 border border-amber-500/40 text-white placeholder:text-slate-500 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 mt-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
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
            <Link href={`/auth/login?role=${selectedRole}`} className="text-amber-400 hover:text-amber-300 hover:underline font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}