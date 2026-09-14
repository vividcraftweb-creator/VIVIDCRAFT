import { createAdminClient } from '@/lib/supabase/server';
import { MessageCircle } from 'lucide-react';
import WhatsAppVerificationsClient from './WhatsAppVerificationsClient';

export const metadata = {
  title: 'WhatsApp Verifications | Admin',
};

export default async function WhatsAppVerificationsPage() {
  let pendingArtists: any[] = [];

  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('profiles')
      .select('id, first_name, last_name, email, created_at, whatsapp_verification_status')
      .eq('whatsapp_verification_status', 'pending_whatsapp')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[whatsapp-verifications] Query error:', error.message);
    } else {
      pendingArtists = data || [];
    }
  } catch (err) {
    console.error('[whatsapp-verifications] Unexpected error:', err);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">WhatsApp Verifications</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manually approve Artist accounts that have sent their WhatsApp verification message.
          </p>
        </div>
      </div>

      {/* Verification Panel */}
      <WhatsAppVerificationsClient initialArtists={pendingArtists} />
    </div>
  );
}
