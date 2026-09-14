'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { MessageCircle, CheckCircle2, Clock, User, Mail, Palette, ArrowRight, Loader2 } from 'lucide-react';

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
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/auth/login');
          return;
        }

        const { data: profileRow } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, whatsapp_verification_status, role')
          .eq('id', user.id)
          .maybeSingle();

        // Only Artists need WhatsApp verification
        if (profileRow?.role && profileRow.role !== 'artist') {
          router.replace('/dashboard');
          return;
        }

        // If already verified, go to dashboard
        if (profileRow?.whatsapp_verification_status === 'verified') {
          router.replace('/dashboard');
          return;
        }

        const firstName = profileRow?.first_name || user.user_metadata?.first_name || '';
        const lastName = profileRow?.last_name || user.user_metadata?.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'Artist';

        setProfile({
          id: user.id,
          email: profileRow?.email || user.email || '',
          fullName,
          whatsapp_verification_status: profileRow?.whatsapp_verification_status || null,
        });

        setStatus(profileRow?.whatsapp_verification_status || null);
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleVerifyViaWhatsApp = async () => {
    if (!profile) return;
    setSending(true);

    try {
      // Update status to pending_whatsapp in DB
      await supabase
        .from('profiles')
        .update({ whatsapp_verification_status: 'pending_whatsapp' })
        .eq('id', profile.id);

      setStatus('pending_whatsapp');

      // Build WhatsApp deep link with pre-filled message
      const message = encodeURIComponent(
        `Hello Admin, I just registered as an Artist. Please verify my account. Name: ${profile.fullName}, Email: ${profile.email}, User ID: ${profile.id}`
      );
      const whatsappUrl = `https://wa.me/94783813833?text=${message}`;

      // Open WhatsApp in new tab
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error updating verification status:', err);
    } finally {
      setSending(false);
    }
  };

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
        </div>

        {/* Artist Details Card */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Account Details</p>

          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <User className="w-4 h-4 text-purple-400" />
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
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Palette className="w-4 h-4 text-indigo-400" />
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
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-300">Verification Pending</p>
                <p className="text-xs text-amber-400/80">
                  Waiting for Admin Approval. Our team will review your WhatsApp message and approve your account shortly.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Already sent the message?{' '}
                <button
                  type="button"
                  onClick={handleVerifyViaWhatsApp}
                  className="text-green-400 hover:text-green-300 underline font-medium transition-colors"
                >
                  Send again
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

        {/* Already Verified? Check Status */}
        <div className="pt-2 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            Already approved by admin?{' '}
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-indigo-400 hover:text-indigo-300 underline font-medium transition-colors"
            >
              Try accessing dashboard
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
