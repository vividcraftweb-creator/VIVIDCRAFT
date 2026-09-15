'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Clock, Loader2, MessageCircle, User, Mail, Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PendingArtist {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string | null;
  whatsapp_verification_status: string;
}

interface WhatsAppVerificationsClientProps {
  initialArtists: PendingArtist[];
}

export default function WhatsAppVerificationsClient({ initialArtists }: WhatsAppVerificationsClientProps) {
  const [artists, setArtists] = useState<PendingArtist[]>(initialArtists);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // ─── Manual Refresh — re-fetch directly from Supabase ────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, created_at, whatsapp_verification_status')
        .eq('whatsapp_verification_status', 'pending_whatsapp')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Remove any locally-approved IDs from refreshed data
      const fresh = (data || []).filter((a) => !approvedIds.has(a.id));
      setArtists(fresh as PendingArtist[]);
      toast.success('List refreshed', { description: `${fresh.length} pending verification${fresh.length !== 1 ? 's' : ''} found.` });
    } catch (err: any) {
      console.error('[refresh] Error:', err);
      toast.error('Failed to refresh. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [approvedIds]);

  // ─── Approve artist ───────────────────────────────────────────────────────
  const handleApprove = async (userId: string) => {
    setApprovingId(userId);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          whatsapp_verification_status: 'verified',
          verification_status: 'verified',
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update profiles verification status directly:', updateError);
      }

      // Also trigger the admin approval API route for service-role level confirmation
      const res = await fetch('/api/admin/approve-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok || !updateError) {
        setApprovedIds((prev) => new Set([...prev, userId]));
        toast.success('Artist approved!', { description: 'The artist now has full dashboard access.' });
        // Remove from list after brief animation
        setTimeout(() => {
          setArtists((prev) => prev.filter((a) => a.id !== userId));
        }, 1200);
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('Approval mutation failed:', data.error || updateError);
        toast.error(`Failed to approve: ${data.error || updateError?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Approval error:', err);
      toast.error('An error occurred while approving. Please try again.');
    } finally {
      setApprovingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats + Refresh bar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            {artists.length === 0 ? (
              <span className="text-green-400 font-medium">No pending verifications ✓</span>
            ) : (
              <>
                <span className="font-semibold">{artists.length}</span> artist{artists.length !== 1 ? 's' : ''} waiting for WhatsApp verification approval
              </>
            )}
          </p>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {artists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">All Caught Up!</h3>
            <p className="text-sm text-slate-400 mt-1">No pending WhatsApp verifications at the moment.</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Artist</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {artists.map((artist) => {
                  const fullName =
                    [artist.first_name, artist.last_name].filter(Boolean).join(' ') || 'Unknown Artist';
                  const isApproved = approvedIds.has(artist.id);
                  const isApproving = approvingId === artist.id;

                  return (
                    <tr
                      key={artist.id}
                      className={`bg-slate-900/40 hover:bg-slate-900/70 transition-all ${isApproved ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{fullName}</p>
                            <p className="text-xs text-slate-500 font-mono">{artist.id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-300">{artist.email || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-400 text-xs">{formatDate(artist.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            Pending WhatsApp
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleApprove(artist.id)}
                          disabled={isApproving || isApproved}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all shadow-sm shadow-green-600/25 cursor-pointer"
                        >
                          {isApproving ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Approving…
                            </>
                          ) : isApproved ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approved
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve Artist
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {artists.map((artist) => {
              const fullName =
                [artist.first_name, artist.last_name].filter(Boolean).join(' ') || 'Unknown Artist';
              const isApproved = approvedIds.has(artist.id);
              const isApproving = approvingId === artist.id;

              return (
                <div
                  key={artist.id}
                  className={`bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 transition-all ${isApproved ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{fullName}</p>
                        <p className="text-xs text-slate-500">{artist.email || '—'}</p>
                      </div>
                    </div>
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(artist.created_at)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApprove(artist.id)}
                    disabled={isApproving || isApproved}
                    className="w-full h-9 flex items-center justify-center gap-2 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all cursor-pointer"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Approving…
                      </>
                    ) : isApproved ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approved
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve Artist
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
