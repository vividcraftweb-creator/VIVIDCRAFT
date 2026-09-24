'use client';

import { useState, useEffect, useCallback, memo, startTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, ZoomIn, Star, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/hooks/useAuth';
import { ArtworkModal } from './ArtworkModal';
import { createClient } from '@/lib/supabase/client';
import { getSafeArtworkUrl, DEFAULT_ARTWORK_PLACEHOLDER } from '@/lib/image-placeholders';
import { inferArtworkPricing, extractArtistName, getArtworkPricingDisplay } from '@/lib/artworks';

export interface ArtworkItem {
  id: string;
  artist_id: string;
  user_id?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  medium?: string | null;
  technique?: string | null;
  tags?: string[] | string | null;
  image_url: string;
  created_at: string;
  likesCount: number;
  isLiked: boolean;
  ratingsCount: number;
  averageRating: number;
  userRating: number | null;
  selling_mode?: string;
  pricing_type?: string;
  price?: number | null;
  amount?: number | null;
  price_amount?: number | null;
  starting_bid?: number | null;
  art_code?: string;
  badge_title?: string | null;
  gig_title?: string | null;
  base_rating?: number | null;
  review_count_text?: string | null;
  user_name?: string | null;
  profiles?: {
    full_name?: string | null;
    display_name?: string | null;
    username?: string | null;
    user_name?: string | null;
    artist_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
    bio?: string | null;
    headline?: string | null;
    title?: string | null;
    location?: string | null;
    category?: string | null;
    address?: string | null;
    [key: string]: any;
  } | null;
  artist?: {
    id: string;
    name: string;
    avatar_url: string | null;
    title?: string;
    role?: string;
    bio?: string | null;
    location?: string | null;
    phone?: string | null;
    whatsapp_number?: string | null;
    category?: string | null;
    [key: string]: any;
  };
  user?: {
    phone?: string | null;
    [key: string]: any;
  } | null;
  artist_phone?: string | null;
  ref_id?: string | null;
  artist_name?: string | null;
}

export interface ArtworkCardProps {
  artwork: ArtworkItem;
  artistName?: string;
  onDelete?: (artworkId: string) => void;
}

export function ArtworkCardComponent({ artwork, artistName: artistNameProp, onDelete }: ArtworkCardProps) {
  // Requirement 1: Instant deletion state across gallery
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    const handleArtworkDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id === artwork.id) {
        startTransition(() => {
          setIsDeleted(true);
        });
      }
    };
    window.addEventListener('artwork-deleted', handleArtworkDeleted);
    return () => window.removeEventListener('artwork-deleted', handleArtworkDeleted);
  }, [artwork.id]);

  // Retrieve price safely per user specification (preserved untouched)
  const displayPrice = Number(artwork.price || artwork.amount || artwork.price_amount || 0);

  // Dynamic Pricing & Status Badge Evaluation (preserved untouched)
  const { statusBadge, badgeType, displayPrice: fallbackDisplayPrice } = getArtworkPricingDisplay(artwork);

  // Requirement 1: Render artist dynamic name strictly per user specification
  const artistName = extractArtistName(artwork, artistNameProp);

  const artistAvatarUrl =
    artwork.profiles?.avatar_url ||
    artwork.artist?.avatar_url ||
    null;

  const router = useRouter();
  const { data: session, status } = useAuth();
  const isAuthenticated = status === 'authenticated' && !!session?.session?.user;
  const currentUserId = session?.session?.user?.id;
  const userMetaRole = (session?.session?.user?.user_metadata?.role || '').toString().toUpperCase();
  const userEmail = (session?.session?.user?.email || '').toLowerCase().trim();
  const isAdmin = userMetaRole === 'ADMIN' || userEmail === 'vividcraftweb@gmail.com' || userEmail === 'cinnamongallerysocial@gmail.com';
  const isOwner = Boolean(currentUserId && (artwork.artist_id === currentUserId || artwork.user_id === currentUserId));
  const canDelete = isOwner || isAdmin;

  // Local optimistic state for instant feedback
  const initialLikesCount = typeof artwork.likesCount === 'number'
    ? artwork.likesCount
    : (typeof (artwork as any).likes_count === 'number'
    ? (artwork as any).likes_count
    : 0);
  const [likesCount, setLikesCount] = useState<number>(initialLikesCount);
  const [isLiked, setIsLiked] = useState<boolean>(Boolean(artwork.isLiked));
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);

  const utils = trpc.useUtils();

  const toggleLikeMutation = trpc.artworks.toggleLike.useMutation({
    onSuccess: (data) => {
      startTransition(() => {
        setIsLiked(data.liked);
        setLikesCount(data.likesCount);
      });
      utils.artworks.getArtistArtworks.invalidate({ artistId: artwork.artist_id });
    },
    onError: (err) => {
      // Revert optimistic state
      startTransition(() => {
        setIsLiked((prev) => !prev);
        setLikesCount((prev) => (isLiked ? prev + 1 : Math.max(0, prev - 1)));
      });
      toast.error(err.message || 'Failed to update like');
    },
  });

  const handleLikeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please sign in to like this artwork', {
        action: {
          label: 'Sign In',
          onClick: () => {
            router.push(
              `/auth/signin?callbackUrl=${encodeURIComponent(
                typeof window !== 'undefined' ? window.location.href : ''
              )}`
            );
          },
        },
      });
      return;
    }

    // Optimistic toggle with startTransition for 0ms click latency
    const nextLiked = !isLiked;
    startTransition(() => {
      setIsLiked(nextLiked);
      setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    });

    toggleLikeMutation.mutate({ artworkId: artwork.id });
  }, [isAuthenticated, isLiked, artwork.id, toggleLikeMutation, router]);

  const handleDeleteClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${artwork.title}"?`)) return;

    // Instant optimistic removal from UI with startTransition
    startTransition(() => {
      setIsDeleted(true);
    });
    if (onDelete) onDelete(artwork.id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('artwork-deleted', { detail: { id: artwork.id } }));
    }

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

      // Async trigger admin server route for cleanup/revalidation
      fetch('/api/admin/delete-artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId: artwork.id, artistId: artwork.artist_id }),
      }).catch(() => {});

      if (error) {
        console.error('Delete error:', error);
        alert('Delete failed: ' + error.message);
        startTransition(() => {
          setIsDeleted(false);
        });
      } else {
        // Force window reload to immediately purge client/server cache across all sessions
        window.location.href = window.location.pathname + '?refresh=' + Date.now();
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Delete failed: ' + (err?.message || 'Unknown error'));
      startTransition(() => {
        setIsDeleted(false);
      });
    }
  }, [artwork.id, artwork.title, artwork.artist_id, onDelete]);

  if (isDeleted) return null;

  const safeImg = getSafeArtworkUrl(artwork.image_url);
  const artworkTitle = (artwork.title || 'Untitled Artwork').trim();

  // Real metrics fetched from database
  const actualRatingsCount =
    typeof artwork.ratingsCount === 'number'
      ? artwork.ratingsCount
      : (typeof (artwork as any).ratings_count === 'number'
      ? (artwork as any).ratings_count
      : (typeof (artwork as any).reviews_count === 'number'
      ? (artwork as any).reviews_count
      : 0));

  const actualAverageRating =
    typeof artwork.averageRating === 'number'
      ? artwork.averageRating
      : (typeof (artwork as any).average_rating === 'number'
      ? (artwork as any).average_rating
      : 0);

  const displayLikes = typeof likesCount === 'number' ? likesCount : 0;

  return (
    <>
      <div className="group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-amber-400/80 dark:hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl dark:hover:shadow-amber-500/10 flex flex-col">
        {/* Artwork Image Container */}
        <div
          className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900/5 dark:bg-slate-950 cursor-pointer select-none"
          onClick={() => setIsZoomOpen(true)}
        >
          {/* Blurred Backdrop Layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safeImg}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover blur-xl scale-125 opacity-40 dark:opacity-50 transition-transform duration-700 ease-out group-hover:scale-150 pointer-events-none"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = DEFAULT_ARTWORK_PLACEHOLDER;
              }}
            />
          </div>

          {/* Exhibition Inner Matte Border & Foreground Artwork Image */}
          <div className="relative z-10 w-full h-full p-2 flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center border border-slate-900/10 dark:border-white/10 rounded-md overflow-hidden bg-black/5 dark:bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={safeImg}
                alt={artworkTitle}
                className="object-contain w-full h-full relative z-10 p-1.5 filter drop-shadow-md transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = DEFAULT_ARTWORK_PLACEHOLDER;
                }}
              />
            </div>
          </div>

          {/* Top-Left Pricing Status Badge (For Sale / Bidding / Not For Sale) */}
          <div className="absolute top-2.5 left-2.5 z-30 pointer-events-none">
            {badgeType === 'FOR_SALE' && (
              <span className="text-[10px] font-bold text-amber-950 dark:text-amber-300 bg-amber-400/90 dark:bg-amber-500/25 border border-amber-500/40 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md">
                {statusBadge}
              </span>
            )}
            {badgeType === 'BIDDING' && (
              <span className="text-[10px] font-bold text-white bg-orange-500/90 dark:bg-orange-500/30 dark:text-orange-300 border border-orange-500/50 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md">
                {statusBadge}
              </span>
            )}
            {badgeType === 'NOT_FOR_SALE' && (
              <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md">
                {statusBadge}
              </span>
            )}
          </div>

          {/* Quick Zoom Preview Icon on Hover */}
          <div className="absolute bottom-2.5 right-2.5 z-30 p-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 hover:text-white shadow-lg">
            <ZoomIn className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Clean Artwork Details Panel */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/60 dark:border-slate-800/60 p-3.5 flex flex-col flex-1 justify-between gap-2.5">
          <div className="space-y-2">
            {/* Real Artist Avatar + Artist Name */}
            <div className="flex items-center gap-2.5">
              {artistAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artistAvatarUrl}
                  alt={artistName}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-300 shrink-0">
                  {artistName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {artistName}
                </span>
              </div>
            </div>

            {/* Dynamic Artwork Title */}
            <h3
              onClick={() => startTransition(() => setIsZoomOpen(true))}
              className="font-semibold text-slate-900 dark:text-slate-100 text-sm hover:text-amber-600 dark:hover:text-amber-400 line-clamp-1 cursor-pointer transition-colors leading-snug"
              title={artworkTitle}
            >
              {artworkTitle}
            </h3>

            {/* Visible Metrics Row: Real Likes Count & Actual Total Reviews from Database */}
            <div className="flex items-center gap-3 text-xs pt-1 select-none">
              {/* Interactive Like Action & Real Likes Count */}
              <button
                type="button"
                onClick={handleLikeClick}
                className={`inline-flex items-center gap-1.5 transition-colors cursor-pointer group/like ${
                  isLiked
                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                }`}
                title={isLiked ? 'Unlike this artwork' : 'Like this artwork'}
                aria-label={`${displayLikes} likes`}
              >
                <Heart
                  className={`w-3.5 h-3.5 transition-transform group-hover/like:scale-110 active:scale-125 ${
                    isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-400 dark:text-slate-500 group-hover/like:text-rose-500'
                  }`}
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {displayLikes}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {displayLikes === 1 ? 'like' : 'likes'}
                </span>
              </button>

              <span className="text-slate-300 dark:text-slate-700 font-light">•</span>

              {/* Dynamic Reviews Metric from Database */}
              <div
                className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400"
                title={`${actualRatingsCount} total reviews`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    actualRatingsCount > 0 ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
                {actualRatingsCount > 0 ? (
                  <>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {Number(actualAverageRating).toFixed(1)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      ({actualRatingsCount} {actualRatingsCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                    0 reviews
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Pricing & Actions Footer */}
          <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block leading-tight">
                {badgeType === 'FOR_SALE' ? 'Price' : badgeType === 'BIDDING' ? 'Starting Bid' : 'Status'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {badgeType === 'FOR_SALE'
                  ? `LKR ${displayPrice.toLocaleString()}`
                  : fallbackDisplayPrice}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Direct WhatsApp Action for For Sale & Bidding */}
              {(() => {
                if (badgeType !== 'FOR_SALE' && badgeType !== 'BIDDING') return null;
                const rawPhone = artwork.profiles?.phone || artwork.user?.phone || artwork.artist_phone || '94783813833';
                const cleanPhone = String(rawPhone).replace(/\D/g, '') || '94783813833';

                const title = artworkTitle;
                const rawRef = artwork.ref_id || artwork.art_code || artwork.id || 'N/A';
                const refId = String(rawRef).replace(/^#/, '');
                const artistFullName = artistName;

                const rawPrice = Number(artwork.price || artwork.price_amount || artwork.amount || artwork.starting_bid || 0);
                const priceDisplay = rawPrice > 0 ? `LKR ${rawPrice.toLocaleString()}` : 'Not For Sale / Contact for Price';

                const fullMessage = `Hi, I am interested in buying "${title}" (Ref ID: #${refId}) by ${artistFullName}. Listed Price: ${priceDisplay}.`;
                const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMessage)}`;

                return (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#A2694E] hover:bg-[#8B5A3C] text-white shadow-sm transition-colors cursor-pointer"
                    title="Ask about price or buy on WhatsApp"
                  >
                    Ask Price (WhatsApp)
                  </a>
                );
              })()}

              {/* Expand / Details CTA */}
              <button
                type="button"
                onClick={() => startTransition(() => setIsZoomOpen(true))}
                aria-label="View artwork details and comments"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-[#A2694E] dark:hover:text-[#C58B6F] bg-slate-100 dark:bg-slate-800 hover:bg-[#A2694E]/10 dark:hover:bg-[#A2694E]/20 border border-slate-200 dark:border-slate-700 transition-all duration-200 cursor-pointer"
              >
                <ZoomIn className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>Details</span>
              </button>

              {/* Owner / Admin Delete Button */}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  aria-label="Delete Post"
                  title="Delete Post"
                  className="inline-flex items-center justify-center p-1 rounded-full text-xs font-medium text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200 dark:hover:border-rose-800/50 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Expanded Artwork Modal with Comments */}
      <ArtworkModal
        isOpen={isZoomOpen}
        onClose={() => startTransition(() => setIsZoomOpen(false))}
        artwork={artwork}
        artistName={artistName}
        likesCount={likesCount}
        isLiked={isLiked}
        onToggleLike={handleLikeClick}
      />
    </>
  );
}

export const ArtworkCard = memo(ArtworkCardComponent);
export default ArtworkCard;
