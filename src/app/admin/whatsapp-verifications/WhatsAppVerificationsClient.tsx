'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, Loader2, MessageCircle, User, Mail, Calendar } from 'lucide-react';

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

  const handleApprove = async (userId: string) => {
    setApprovingId(userId);
    try {
      const res = await fetch('/api/admin/approve-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setApprovedIds((prev) => new Set([...prev, userId]));
        // Remove from list after a brief animation delay
        setTimeout(() => {
          setArtists((prev) => prev.filter((a) => a.id !== userId));
        }, 1200);
      } else {
        const data = await res.json();
        console.error('Approval failed:', data.error);
        alert(`Failed to approve: ${data.error}`);
      }
    } catch (err) {
      console.error('Approval error:', err);
      alert('An error occurred while approving. Please try again.');
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

  if (artists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">All Caught Up!</h3>
          <p className="text-sm text-slate-400 mt-1">No pending WhatsApp verifications at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <p className="text-sm text-amber-300">
          <span className="font-semibold">{artists.length}</span> artist{artists.length !== 1 ? 's' : ''} waiting for WhatsApp verification approval
        </p>
      </div>

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
              const fullName = [artist.first_name, artist.last_name].filter(Boolean).join(' ') || 'Unknown Artist';
              const isApproved = approvedIds.has(artist.id);
              const isApproving = approvingId === artist.id;

              return (
                <tr
                  key={artist.id}
                  className={`bg-slate-900/40 hover:bg-slate-900/70 transition-all ${isApproved ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-purple-400" />
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
          const fullName = [artist.first_name, artist.last_name].filter(Boolean).join(' ') || 'Unknown Artist';
          const isApproved = approvedIds.has(artist.id);
          const isApproving = approvingId === artist.id;

          return (
            <div
              key={artist.id}
              className={`bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 transition-all ${isApproved ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-purple-400" />
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
    </div>
  );
}
