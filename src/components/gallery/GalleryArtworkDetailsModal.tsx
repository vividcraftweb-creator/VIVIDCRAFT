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
      document.body.style.overflow = originalOverflow || 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, artwork, onClose]);

  if (!isOpen || !artwork) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-3xl max-h-[90vh] my-auto overflow-y-auto rounded-2xl bg-[#0d1527] border border-slate-700/60 p-6 shadow-2xl flex flex-col gap-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10 shrink-0">
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
                (artwork as any).profiles?.avatar_url || artwork.artist?.avatar_url
              );
              return (
                <Avatar className="w-10 h-10 sm:w-11 sm:h-11 ring-1 ring-[#A2694E]/40 shrink-0">
                  {modalAvatarUrl && <AvatarImage src={modalAvatarUrl} alt={modalArtistName} />}
                  <AvatarFallback className="bg-[#A2694E]/20 text-[#C58B6F] text-xs font-bold">
                    {(modalArtistName || 'AR').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              );
            })()}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {(() => {
                  const { statusBadge, badgeType } = getArtworkPricingDisplay(artwork);
                  return (
                    <>
                      {badgeType === 'FOR_SALE' && (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                          {statusBadge}
                        </span>
                      )}
                      {badgeType === 'BIDDING' && (
                        <span className="text-xs font-semibold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                          {statusBadge}
                        </span>
                      )}
                      {badgeType === 'NOT_FOR_SALE' && (
                        <span className="text-xs font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">
                          {statusBadge}
                        </span>
                      )}
                    </>
                  );
                })()}
                <span className="text-xs text-slate-400 font-mono">
                  Ref: {artwork.art_code || '#ART-101'}
                </span>
              </div>
              <h3 className="font-bold text-white text-base sm:text-lg leading-tight truncate">
                {artwork.title}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                <Link
                  href={`/freelancers/${artwork.artist_id}`}
                  className="text-[#C58B6F] hover:text-[#E2A78C] hover:underline font-medium"
                >
                  by {extractArtistName(artwork)}
                </Link>
                {(() => {
                  const { displayPrice, badgeType } = getArtworkPricingDisplay(artwork);
                  if (!displayPrice) return null;
                  return (
                    <>
                      <span className="text-slate-500">•</span>
                      <span className="font-bold text-[#C58B6F]">
                        {badgeType === 'FOR_SALE' ? `Price: ${displayPrice}` : displayPrice}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDeleteClick(artwork)}
                className="h-8 px-2.5 sm:px-3 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete Post</span>
              </Button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* 2. Image Container (responsive fixed/aspect ratio: relative w-full h-[320px] rounded-xl overflow-hidden) */}
        <div className="relative w-full h-[320px] rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center shrink-0 border border-white/10">
          <div
            className="absolute inset-0 opacity-20 blur-3xl scale-125 pointer-events-none"
            style={{
              backgroundImage: `url(${getSafeArtworkUrl(artwork.image_url)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getSafeArtworkUrl(artwork.image_url)}
            alt={artwork.title || 'Artwork'}
            className="relative z-10 w-full h-full object-contain select-none"
          />
          <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-none">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-black/70 backdrop-blur-md text-white/90 border border-white/15 shadow-sm">
              Original Artwork
            </span>
          </div>
        </div>

        {/* 3. Artwork Description */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-200">
          <span className="font-bold text-[#A2694E] dark:text-[#C58B6F] block mb-1 text-[11px] uppercase tracking-wider">
            Artwork Story &amp; Description
          </span>
          {artwork.description ? (
            <p className="whitespace-pre-line text-xs sm:text-sm text-slate-300 leading-relaxed">
              {artwork.description}
            </p>
          ) : (
            <p className="italic text-slate-500 text-xs sm:text-sm">
              No description provided for this artwork.
            </p>
          )}
        </div>

        {/* 4. Artist Profile Box */}
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
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#A2694E]/5 border border-[#A2694E]/25 text-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-[11px] uppercase tracking-wider text-[#A2694E] dark:text-[#C58B6F]">
                  Artist Profile
                </span>
                <Link
                  href={`/freelancers/${artwork.artist_id}`}
                  className="text-xs text-[#A2694E] dark:text-[#C58B6F] hover:text-[#8B5A3C] dark:hover:text-[#E2A78C] hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <span>View Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="font-semibold text-white text-sm">{name}</div>
              <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-relaxed">{bio}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 flex-wrap">
                <span>
                  Location: <strong className="text-slate-200">{location}</strong>
                </span>
                <span>•</span>
                <span>
                  Category: <strong className="text-slate-200">{category}</strong>
                </span>
              </div>
            </div>
          );
        })()}

        {/* 5. Action Footer */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            {/* Like Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => onLike(artwork.id, e)}
              className={`gap-2 h-9 px-3.5 text-xs cursor-pointer border ${
                artwork.isLiked
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 font-semibold'
                  : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-rose-500/10 hover:border-rose-500/30'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  artwork.isLiked ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
              <span>{artwork.likesCount} Likes</span>
            </Button>

            {/* Rating Score & Reviews */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#A2694E]/10 border border-[#A2694E]/25 text-xs text-[#C58B6F]">
              <Star className="w-3.5 h-3.5 fill-[#A2694E] text-[#A2694E]" />
              <span className="font-semibold text-white text-xs">
                {artwork.averageRating > 0
                  ? artwork.averageRating.toFixed(1)
                  : 'Unrated'}
              </span>
              <span className="text-slate-400 text-[11px]">({artwork.ratingsCount} reviews)</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
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
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 px-3.5 rounded-xl cursor-pointer shadow-sm transition-colors"
                >
                  Ask Price (WhatsApp)
                </a>
              );
            })()}

            {/* Direct Action: View Profile */}
            <Link
              href={`/freelancers/${artwork.artist_id}`}
              className="flex-1 sm:flex-initial"
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-slate-800/80 border-[#A2694E]/30 text-[#C58B6F] hover:bg-[#A2694E]/10 hover:text-white gap-1.5 h-9 px-3.5 text-xs cursor-pointer"
              >
                <span>View Artist</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
