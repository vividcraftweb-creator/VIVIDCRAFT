'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import {
  Palette,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Check,
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'artist' | 'client'>('artist');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setRoleMutation = trpc.user.setRole.useMutation();

  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndProfile() {
      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authUser) {
          router.replace('/auth/login?callbackUrl=/onboarding');
          return;
        }

        if (isMounted) {
          setUser(authUser);

          // Check if profile already has a role set
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authUser.id)
            .maybeSingle();

          const rawRole = (
            profile?.role ||
            authUser.user_metadata?.role ||
            authUser.user_metadata?.userRole ||
            authUser.user_metadata?.user_type ||
            ''
          ).toLowerCase();

          if (rawRole === 'client' || rawRole === 'buyer') {
            setSelectedRole('client');
          } else {
            setSelectedRole('artist');
          }
        }
      } catch (err) {
        console.error('[onboarding] Auth check error:', err);
      } finally {
        if (isMounted) setLoadingUser(false);
      }
    }

    checkAuthAndProfile();

    return () => {
      isMounted = false;
    };
  }, [supabase, router]);

  const handleConfirmRole = async () => {
    if (!user?.id) {
      toast.error('Session expired', {
        description: 'Please sign in again to continue.',
      });
      router.replace('/auth/login?callbackUrl=/onboarding');
      return;
    }

    setIsSubmitting(true);

    try {
      const timestamp = new Date().toISOString();

      // 1. Direct Supabase update on public.profiles using authenticated client
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: selectedRole,
          updated_at: timestamp,
        })
        .eq('id', user.id);

      if (profileError) {
        console.warn('[onboarding] Direct profile update notice, attempting upsert:', profileError.message);
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            role: selectedRole,
            email: user.email || null,
            updated_at: timestamp,
          },
          { onConflict: 'id' }
        );
      }

      // 2. Call tRPC procedure to update server DB & user_metadata
      try {
        await setRoleMutation.mutateAsync({ role: selectedRole });
      } catch (trpcErr: any) {
        console.warn('[onboarding] tRPC setRole mutation notice:', trpcErr?.message || trpcErr);
      }

      // 3. Call provision-user API endpoint for full system synchronization
      try {
        await fetch('/api/auth/provision-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: selectedRole,
            firstName:
              user.user_metadata?.first_name ||
              user.user_metadata?.firstName ||
              '',
            lastName:
              user.user_metadata?.last_name ||
              user.user_metadata?.lastName ||
              '',
          }),
        });
      } catch (provisionErr) {
        console.warn('[onboarding] provision-user sync notice:', provisionErr);
      }

      // 4. Verify that profiles table has the updated role
      const { data: verifiedProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      console.log('[onboarding] Verified role in database:', verifiedProfile?.role || selectedRole);

      toast.success('Role selected successfully!', {
        description:
          selectedRole === 'artist'
            ? 'Welcome to your Artist Studio! Redirecting to Dashboard...'
            : 'Welcome to Vivid Craft! Redirecting...',
      });

      // 5. Navigate to appropriate destination
      if (selectedRole === 'artist') {
        window.location.replace('/dashboard');
      } else {
        window.location.replace('/freelancers');
      }
    } catch (err: any) {
      console.error('[onboarding] Error saving role:', err);
      toast.error('Failed to save role', {
        description: err?.message || 'Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-sm text-slate-400">Loading your profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4 py-12 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl shadow-black/60 p-6 sm:p-10 space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-2">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Choose Your Platform Role
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto">
            Select how you would like to participate in the Vivid Craft creative marketplace.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Artist Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedRole('artist')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setSelectedRole('artist');
            }}
            className={`relative p-6 rounded-2xl border text-left cursor-pointer transition-all ${
              selectedRole === 'artist'
                ? 'bg-purple-950/40 border-purple-500 shadow-xl shadow-purple-500/15 ring-2 ring-purple-500/40'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            {/* Selected Indicator */}
            <div className="absolute top-4 right-4">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  selectedRole === 'artist'
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                    : 'border border-slate-700 bg-slate-900 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 mb-4 border border-purple-500/30">
              <Palette className="w-6 h-6" />
            </div>

            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-white">Artist / Creator</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Featured
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Showcase your portfolio, receive client inquiries, and sell custom art.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span>Upload & manage artwork portfolio</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span>Direct client WhatsApp connection</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span>Artwork likes, star ratings & reviews</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span>Full Artist Studio & analytics</span>
              </li>
            </ul>
          </div>

          {/* Client Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedRole('client')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setSelectedRole('client');
            }}
            className={`relative p-6 rounded-2xl border text-left cursor-pointer transition-all ${
              selectedRole === 'client'
                ? 'bg-blue-950/40 border-blue-500 shadow-xl shadow-blue-500/15 ring-2 ring-blue-500/40'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            {/* Selected Indicator */}
            <div className="absolute top-4 right-4">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  selectedRole === 'client'
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                    : 'border border-slate-700 bg-slate-900 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 mb-4 border border-blue-500/30">
              <ShoppingBag className="w-6 h-6" />
            </div>

            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-white">Buyer / Collector</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Explorer
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Explore creator portfolios, commission original art, and connect with artists.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>Browse curated artist portfolios</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>Inquire & negotiate via WhatsApp</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>Like, rate, and comment on artworks</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>Leave client testimonials & reviews</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmRole}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer ${
              selectedRole === 'artist'
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving role selection...</span>
              </>
            ) : (
              <>
                <span>
                  Continue as {selectedRole === 'artist' ? 'Artist / Creator' : 'Buyer / Collector'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-center text-xs text-slate-500 mt-3">
            You can always update your profile settings later from your account preferences.
          </p>
        </div>
      </div>
    </main>
  );
}
