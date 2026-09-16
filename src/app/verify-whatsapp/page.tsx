'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import {
  MessageCircle,
  CheckCircle2,
  Clock,
  User,
  Mail,
  Palette,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  whatsapp_verification_status: string | null;
}

export default function VerifyWhatsAppPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ─── Load profile on mount ─────────────────────────────────────────────────
  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/auth/login');
          return;
        }

        // Fetch fresh profile row directly from Supabase to check verification status
        const { data: freshProfile } = await supabase
          .from('profiles')
          .select('whatsapp_verification_status, verification_status')
          .eq('id', user.id)
          .single();

        // If whatsapp_verification_status === 'verified' OR verification_status === 'verified', force hard redirect
        if (
          freshProfile?.whatsapp_verification_status === 'verified' ||
          freshProfile?.verification_status === 'verified'
        ) {
          window.location.href = '/dashboard';
          return;
        }

        const { data: profileRow } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, whatsapp_verification_status, verification_status, role')
          .eq('id', user.id)
          .maybeSingle();

        // Only Artists need WhatsApp verification
        if (profileRow?.role && profileRow.role !== 'artist') {
          router.replace('/dashboard');
          return;
        }

        const firstName = profileRow?.first_name || user.user_metadata?.first_name || '';
        const lastName = profileRow?.last_name || user.user_metadata?.last_name || '';
        const fullName =
          `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'Artist';

        const userProfile: UserProfile = {
          id: user.id,
          email: profileRow?.email || user.email || '',
          fullName,
          whatsapp_verification_status: profileRow?.whatsapp_verification_status || null,
        };

        setProfile(userProfile);
        setStatus(profileRow?.whatsapp_verification_status || null);

        // ─── Set up Supabase real-time subscription ──────────────────────────
        // Subscribe to changes on this user's profile row
        const channel = supabase
          .channel(`whatsapp-verify-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              const newWhatsappStatus = (payload.new as any)?.whatsapp_verification_status;
              const newVerificationStatus = (payload.new as any)?.verification_status;
              if (newWhatsappStatus === 'verified' || newVerificationStatus === 'verified') {
                toast.success('🎉 Account Approved!', {
                  description: 'Your account has been verified. Redirecting to dashboard...',
                  duration: 3000,
                });
                window.location.href = '/dashboard';
              } else if (newWhatsappStatus) {
                setStatus(newWhatsappStatus);
              }
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();

    // Cleanup real-time channel on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [router]);

  // ─── Manual status check (re-fetch from DB) ───────────────────────────────
  const handleCheckStatus = async () => {
    if (!profile) return;
    setChecking(true);
    try {
      const { data: profileRow, error } = await supabase
        .from('profiles')
        .select('whatsapp_verification_status, verification_status')
        .eq('id', profile.id)
        .single();

      if (error) {
        throw error;
      }

      const isVerified =
        profileRow?.whatsapp_verification_status === 'verified' ||
        profileRow?.verification_status === 'verified';

      if (isVerified) {
        toast.success('🎉 Account Approved!', {
          description: 'Your account has been verified. Redirecting to dashboard...',
          duration: 3000,
        });
        window.location.href = '/dashboard';
        return;
      } else if (profileRow?.whatsapp_verification_status === 'pending_whatsapp') {
        toast.info('Still Pending', {
          description: 'Your account is still awaiting admin approval.',
          duration: 3000,
        });
        setStatus('pending_whatsapp');
      } else {
        toast.info('Not yet sent', {
          description: 'Please send your WhatsApp verification message first.',
        });
        setStatus(profileRow?.whatsapp_verification_status || null);
      }
    } catch (err) {
      console.error('Error checking status:', err);
      toast.error('Failed to check status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  // ─── Send / re-send WhatsApp message ──────────────────────────────────────
  const handleVerifyViaWhatsApp = async () => {
    if (!profile) return;
    setSending(true);

    try {
      // Update status to pending_whatsapp in DB
      const { error } = await supabase
        .from('profiles')
        .update({ whatsapp_verification_status: 'pending_whatsapp' })
        .eq('id', profile.id);

      if (error) throw error;

      setStatus('pending_whatsapp');

      // Build WhatsApp deep link with pre-filled message
      const message = encodeURIComponent(
        `Hello Admin, I just registered as an Artist. Please verify my account. Name: ${profile.fullName}, Email: ${profile.email}, User ID: ${profile.id}`
      );
      const rawPhone = '94783813833';
      const cleanPhone = String(rawPhone).replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;

      // Open WhatsApp in new tab
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error updating verification status:', err);
      toast.error('Failed to update status. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  const isPending = status === 'pending_whatsapp';

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4 py-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-emerald-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 p-6 sm:p-8 space-y-6 relative z-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 mb-1">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            WhatsApp Verification
          </h1>
          <p className="text-sm text-slate-400">
            Your artist account requires manual verification by our admin team.
          </p>
          {/* Real-time listening indicator */}
          {isPending && (
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Listening for admin approval in real-time
            </div>
          )}
        </div>

        {/* Artist Details Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Account Details</p>

          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <User className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Full Name</p>
              <p className="text-sm font-medium text-white">{profile.fullName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Email Address</p>
              <p className="text-sm font-medium text-white">{profile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Palette className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Account Type</p>
              <p className="text-sm font-medium text-white">Artist / Creator</p>
            </div>
          </div>
        </div>

        {/* Status / Action Area */}
        {isPending ? (
          /* Pending State */
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-300">Verification Pending</p>
                <p className="text-xs text-amber-400/80">
                  Waiting for Admin Approval. Our team will review your WhatsApp message and approve your account shortly.
                </p>
              </div>
            </div>

            {/* Manual "Check Approval Status" button */}
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
            >
              {checking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking Status...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Check Approval Status</span>
                </>
              )}
            </button>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Haven&apos;t sent the message yet?{' '}
                <button
                  type="button"
                  onClick={handleVerifyViaWhatsApp}
                  disabled={sending}
                  className="text-green-400 hover:text-green-300 underline font-medium transition-colors disabled:opacity-50"
                >
                  {sending ? 'Opening...' : 'Send via WhatsApp'}
                </button>
              </p>
            </div>
          </div>
        ) : (
          /* Initial State — Prompt to Verify */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <p className="text-xs text-slate-400 font-medium">How it works:</p>
              <ol className="text-xs text-slate-500 space-y-1.5 list-none">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span>
                  Click the button below to open WhatsApp
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span>
                  A pre-filled verification message will be ready — just hit Send
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span>
                  Our admin will approve your account and you&apos;ll get full dashboard access
                </li>
              </ol>
            </div>

            <button
              type="button"
              onClick={handleVerifyViaWhatsApp}
              disabled={sending}
              className="w-full h-12 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-green-600/25 transition-all flex items-center justify-center gap-2.5 text-sm cursor-pointer"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Opening WhatsApp...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="h-5 w-5" />
                  <span>Verify via WhatsApp</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            Already approved by admin?{' '}
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={checking}
              className="text-amber-400 hover:text-amber-300 underline font-medium transition-colors disabled:opacity-50"
            >
              {checking ? 'Checking...' : 'Check status now'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
