'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { getSafeArtworkUrl } from '@/lib/image-placeholders';
import type { RankedArtwork } from '@/types/artwork';

interface GalleryDeleteModalProps {
  artwork: RankedArtwork | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: (artworkId: string) => void;
}

export default function GalleryDeleteModal({
  artwork,
  isOpen,
  onClose,
  onDeleted,
}: GalleryDeleteModalProps) {
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !artwork) return null;

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    const reason =
      deleteReason.trim() ||
      'Content removed by administrator in violation of community guidelines.';

    try {
      const supabase = createClient();
      try {
        await supabase.from('artwork_likes').delete().eq('artwork_id', artwork.id);
      } catch {}
      try {
        await supabase.from('artwork_ratings').delete().eq('artwork_id', artwork.id);
      } catch {}
      try {
        await supabase.from('artwork_comments').delete().eq('artwork_id', artwork.id);
      } catch {}

      const { error } = await supabase.from('artworks').delete().eq('id', artwork.id);

      // Trigger admin server action for notification/cleanup
      fetch('/api/admin/delete-artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId: artwork.id,
          artistId: artwork.artist_id,
          reason,
        }),
      }).catch(() => {});

      if (error) {
        console.error('Delete error:', error);
        alert('Delete failed: ' + error.message);
      } else {
        if (onDeleted) {
          onDeleted(artwork.id);
        }
        window.location.href = window.location.pathname + '?refresh=' + Date.now();
      }
    } catch (err: any) {
      console.error('Delete artwork error:', err);
      alert('Delete failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => !isDeleting && onClose()}
    >
      <div
        className="relative max-w-lg w-full bg-white dark:bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl shadow-rose-950/20 dark:shadow-rose-950/40 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center flex-shrink-0 text-rose-500 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
              Remove Artwork from Gallery
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              This post will be permanently deleted and the target artist will receive an official notification detailing the reason.
            </p>
          </div>
        </div>

        {/* Artwork Summary */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getSafeArtworkUrl(artwork.image_url)}
            alt={artwork.title}
            className="w-12 h-12 rounded-lg object-cover bg-slate-200 dark:bg-slate-900 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{artwork.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Artist: {artwork.artist.name}</p>
          </div>
        </div>

        {/* Reason Input */}
        <div className="space-y-2">
          <label htmlFor="deletion-reason" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Reason for Deletion <span className="text-rose-500 dark:text-rose-400">*</span>
          </label>
          <textarea
            id="deletion-reason"
            rows={3}
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Explain why this artwork is being removed (sent directly to the artist's notifications)..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-rose-500 rounded-xl p-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-1 focus:ring-rose-500 focus:outline-none resize-none"
          />

          {/* Preset quick chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              'Copyright infringement',
              'Inappropriate content',
              'Low quality / Spam',
              'Community guidelines violation',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDeleteReason(preset)}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDeleting}
            onClick={onClose}
            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isDeleting}
            onClick={handleConfirmDelete}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-2 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting & Notifying...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirm Deletion</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
