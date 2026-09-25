'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  Heart,
  Star,
  X,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSafeArtworkUrl } from '@/lib/image-placeholders';
import { getProfilePictureUrl } from '@/lib/profile-helpers';
import { getArtworkPricingDisplay, extractArtistName } from '@/lib/artworks';
import type { RankedArtwork } from '@/types/artwork';

interface GalleryArtworkDetailsModalProps {
  artwork: RankedArtwork | null;
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onLike: (artworkId: string, e?: React.MouseEvent) => void;
  onDeleteClick: (artwork: RankedArtwork) => void;
}

export default function GalleryArtworkDetailsModal({
  artwork,
  isOpen,
  isAdmin,
  onClose,
  onLike,
  onDeleteClick,
}: GalleryArtworkDetailsModalProps) {
  useEffect(() => {
    if (!isOpen || !artwork) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, artwork, onClose]);

  if (!isOpen || !artwork) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/80 p-4 pt-24 md:pt-28 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[80vh] my-auto overflow-y-auto rounded-2xl bg-[#0f172a] dark shadow-2xl border border-white/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-30 flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0f172a]/95 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            {(() => {
              const modalArtistName = (
                (artwork as any).profiles?.full_name ||
                (artwork as any).profiles?.display_name ||
                (artwork as any).profiles?.username ||
                (artwork as any).profiles?.artist_name ||
                (artwork as any).user_name ||
                artwork.artist?.name ||
                'Artist'
              ).trim();
              const modalAvatarUrl = getProfilePictureUrl(
                artwork.artist_id,
                (artwork as any).profiles?.avatar_url || artwork.artist.avatar_url
              );
              return (
                <Avatar className="w-10 h-10 ring-1 ring-amber-500/30 flex-shrink-0">
                  {modalAvatarUrl && <AvatarImage src={modalAvatarUrl} alt={modalArtistName} />}
                  <AvatarFallback className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold">
                    {(modalArtistName || 'AR').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              );
            })()}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {(() => {
                  const { statusBadge, badgeType } = getArtworkPricingDisplay(artwork);
                  return (
                    <>
                      {badgeType === 'FOR_SALE' && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                          {statusBadge}
                        </span>
                      )}
                      {badgeType === 'BIDDING' && (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-2.5 py-0.5 rounded-full">
                          {statusBadge}
                        </span>
                      )}
                      {badgeType === 'NOT_FOR_SALE' && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                          {statusBadge}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-tight truncate">
                {artwork.title}
              </h4>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Link
                  href={`/freelancers/${artwork.artist_id}`}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline font-medium"
                >
                  by {extractArtistName(artwork)}
                </Link>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  • Ref ID: {artwork.art_code || '#ART-101'}
                </span>
                {(() => {
                  const { displayPrice, badgeType } = getArtworkPricingDisplay(artwork);
                  return (
                    <>
                      {badgeType === 'FOR_SALE' && (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          • Price: {displayPrice}
                        </span>
                      )}
                      {badgeType === 'BIDDING' && (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          • {displayPrice}
                        </span>
                      )}
                      {badgeType === 'NOT_FOR_SALE' && (
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          • {displayPrice}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Artwork Description in Modal */}
              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-amber-600 dark:text-amber-400 block mb-0.5 text-[10px] uppercase tracking-wider">
                  Artwork Story &amp; Description
                </span>
                {artwork.description ? (
                  <p className="whitespace-pre-line text-xs">{artwork.description}</p>
                ) : (
                  <p className="italic text-slate-400 dark:text-slate-500 text-xs">No description provided for this artwork.</p>
                )}
              </div>

              {/* Full Artist Profile Info Section */}
              {(() => {
                const profile = (artwork as any).profiles;
                const name = extractArtistName(artwork);
                const bio =
                  profile?.bio ||
                  profile?.headline ||
                  profile?.title ||
                  artwork.artist?.bio ||
                  artwork.artist?.title ||
                  'Visual artist & creator on Cinnamon Gallery.';
                const location =
                  profile?.location || profile?.address || artwork.artist?.location || 'Sri Lanka';
                const category =
                  (artwork as any).category ||
                  profile?.category ||
                  (profile?.role
                    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
                    : 'Visual Arts');

                return (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50/60 dark:bg-slate-800/50 border border-amber-200/50 dark:border-slate-700/60 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Artist Profile
                      </span>
                      <Link
                        href={`/freelancers/${artwork.artist_id}`}
                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                      >
                        View Profile &rarr;
                      </Link>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white text-xs">{name}</div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">{bio}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>
                        Location: <strong className="text-slate-700 dark:text-slate-300">{location}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Category: <strong className="text-slate-700 dark:text-slate-300">{category}</strong>
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDeleteClick(artwork)}
                className="h-8 px-3 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Post (Admin)</span>
              </Button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-200 dark:border-transparent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Image Display */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center min-h-[300px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getSafeArtworkUrl(artwork.image_url)}
            alt={artwork.title}
            className="max-h-[60vh] w-auto max-w-full object-contain"
          />
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0f172a]/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            {/* Like Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => onLike(artwork.id, e)}
              className={`gap-2 h-10 px-4 cursor-pointer ${
                artwork.isLiked
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-semibold'
                  : 'bg-white dark:bg-transparent border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-300 dark:hover:border-rose-500/30'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${
                  artwork.isLiked ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
              <span>{artwork.likesCount} Likes</span>
            </Button>

            {/* Rating Score */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-900 dark:text-white text-sm">
                {artwork.averageRating > 0
                  ? artwork.averageRating.toFixed(1)
                  : 'Unrated'}
              </span>
              <span className="text-slate-500 dark:text-slate-400">({artwork.ratingsCount} reviews)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* WhatsApp Inquiry Action for Fixed Price & For Sale Artworks */}
            {(() => {
              const { badgeType } = getArtworkPricingDisplay(artwork);
              if (badgeType !== 'FOR_SALE' && badgeType !== 'BIDDING') return null;

              const rawPhone =
                (artwork as any).profiles?.phone ||
                (artwork as any).user?.phone ||
                (artwork as any).artist_phone ||
                '94783813833';
              const cleanPhone = String(rawPhone).replace(/\D/g, '') || '94783813833';

              const title = artwork.title || 'Artwork';
              const rawRef =
                (artwork as any).ref_id ||
                (artwork as any).art_code ||
                artwork.id ||
                'N/A';
              const refId = String(rawRef).replace(/^#/, '');
              const modalArtist =
                (artwork as any).profiles?.full_name ||
                (artwork as any).artist_name ||
                artwork.artist?.name ||
                'Artist';

              // Format price safely using existing price fallback values
              const rawPrice = Number(
                artwork.price ||
                  (artwork as any).price_amount ||
                  (artwork as any).amount ||
                  (artwork as any).starting_bid ||
                  0
              );
              const priceDisplay =
                rawPrice > 0
                  ? `LKR ${rawPrice.toLocaleString()}`
                  : 'Not For Sale / Contact for Price';

              // Build full dynamic message string
              const fullMessage = `Hi, I am interested in buying "${title}" (Ref ID: #${refId}) by ${modalArtist}. Listed Price: ${priceDisplay}.`;
              const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMessage)}`;

              return (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm h-10 px-4 rounded-xl cursor-pointer shadow-sm transition-colors"
                >
                  Ask Price (WhatsApp)
                </a>
              );
            })()}

            {/* Direct Action: View Profile */}
            <Link
              href={`/freelancers/${artwork.artist_id}`}
              className="w-full sm:w-auto"
            >
              <Button
                variant="outline"
                className="w-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-2 h-10 px-4 cursor-pointer"
              >
                <span>View Artist</span>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
