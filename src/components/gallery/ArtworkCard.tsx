'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, ZoomIn, Star, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/hooks/useAuth';
import { ArtworkModal } from './ArtworkModal';
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
}

export interface ArtworkCardProps {
  artwork: ArtworkItem;
  artistName?: string;
  onDelete?: (artworkId: string) => void;
}

export function ArtworkCard({ artwork, artistName: artistNameProp, onDelete }: ArtworkCardProps) {
  // Step 2: Log artwork database object directly to console to verify column names
  console.log('Artwork database object (ArtworkCard):', {
    id: artwork?.id,
    title: artwork?.title,
    price: artwork?.price,
    pricing_type: artwork?.pricing_type,
    selling_type: (artwork as any)?.selling_type || artwork?.selling_mode,
    amount: (artwork as any)?.amount,
  });

  // Requirement 1: Instant deletion state across gallery
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    const handleArtworkDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id === artwork.id) {
        setIsDeleted(true);
      }
    };
    window.addEventListener('artwork-deleted', handleArtworkDeleted);
    return () => window.removeEventListener('artwork-deleted', handleArtworkDeleted);
  }, [artwork.id]);

  // Retrieve price safely per user specification (preserved untouched)
  const displayPrice = Number(artwork.price || artwork.amount || artwork.price_amount || 0);

  // Dynamic Pricing & Status Badge Evaluation (preserved untouched)
  const { statusBadge, badgeType, displayPrice: fallbackDisplayPrice } = getArtworkPricingDisplay(artwork);

  // Requirement 2: Render artist full name dynamically strictly per user specification
  const artistName =
    artwork.profiles?.full_name ||
    artwork.profiles?.display_name ||
    artwork.profiles?.username ||
    artwork.user_name ||
    artwork.profiles?.artist_name ||
    extractArtistName(artwork, artistNameProp) ||
    artwork.artist?.name ||
    artistNameProp ||
    'Artist';

  const artistAvatarUrl =
    artwork.profiles?.avatar_url ||
    artwork.artist?.avatar_url ||
    null;

  const router = useRouter();
  const { data: session, status } = useAuth();
  const isAuthenticated = status === 'authenticated' && !!session?.session?.user;
  const currentUserId = session?.session?.user?.id;
  const userMetaRole = (session?.session?.user?.user_metadata?.role || '').toString().toUpperCase();
  const isAdmin = userMetaRole === 'ADMIN' || session?.session?.user?.email === 'vividcraftweb@gmail.com';
  const isOwner = Boolean(currentUserId && (artwork.artist_id === currentUserId || artwork.user_id === currentUserId));
  const canDelete = isOwner || isAdmin;

  // Local optimistic state for instant feedback
  const [likesCount, setLikesCount] = useState<number>(artwork.likesCount);
  const [isLiked, setIsLiked] = useState<boolean>(artwork.isLiked);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);

  const utils = trpc.useUtils();

  const toggleLikeMutation = trpc.artworks.toggleLike.useMutation({
    onSuccess: (data) => {
      setIsLiked(data.liked);
      setLikesCount(data.likesCount);
      utils.artworks.getArtistArtworks.invalidate({ artistId: artwork.artist_id });
    },
    onError: (err) => {
      // Revert optimistic state
      setIsLiked((prev) => !prev);
      setLikesCount((prev) => (isLiked ? prev + 1 : Math.max(0, prev - 1)));
      toast.error(err.message || 'Failed to update like');
    },
  });

  const handleLikeClick = (e: React.MouseEvent) => {
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

    // Optimistic toggle
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    toggleLikeMutation.mutate({ artworkId: artwork.id });
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${artwork.title}"?`)) return;

    // Instant optimistic removal from UI
    setIsDeleted(true);
    if (onDelete) onDelete(artwork.id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('artwork-deleted', { detail: { id: artwork.id } }));
    }

    try {
      const res = await fetch('/api/admin/delete-artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId: artwork.id, artistId: artwork.artist_id }),
      });

      if (!res.ok) {
        // Fallback to /api/artworks/delete
        await fetch('/api/artworks/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artworkId: artwork.id }),
        });
      }

      toast.success('Artwork deleted successfully');
      router.refresh();
      utils.artworks.getAllArtworks.invalidate();
      utils.artworks.getMyArtworks.invalidate();
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error('Failed to delete artwork: ' + err.message);
      setIsDeleted(false);
    }
  };

  if (isDeleted) return null;

  const safeImg = getSafeArtworkUrl(artwork.image_url);

  return (
    <>
      <div className="group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-amber-400/80 dark:hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl dark:hover:shadow-amber-500/10 flex flex-col">
        {/* Artwork Image Container */}
        <div
          className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900/5 dark:bg-slate-950 cursor-pointer"
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
          <div className="relative z-10 w-full h-full p-2.5 flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center border border-slate-900/10 dark:border-white/10 rounded-md overflow-hidden bg-black/5 dark:bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={safeImg}
                alt={artwork.title || 'Artwork'}
                className="object-contain w-full h-full relative z-10 p-2 filter drop-shadow-md transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = DEFAULT_ARTWORK_PLACEHOLDER;
                }}
              />
            </div>
          </div>

          {/* Quick Zoom Preview Icon on Hover */}
          <div className="absolute top-3 right-3 z-30 p-2 rounded-xl bg-black/50 backdrop-blur-md text-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 hover:text-white shadow-lg">
            <ZoomIn className="h-4 w-4" />
          </div>
        </div>

        {/* Glassmorphism Card Overlay & Formal Details Panel */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 p-4 flex flex-col flex-1 justify-between gap-3">
          <div>
            <div className="flex items-start justify-between gap-2">
              {/* Title */}
              <h3
                onClick={() => setIsZoomOpen(true)}
                className="truncate font-semibold text-slate-900 dark:text-slate-100 text-base cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex-1"
                title={artwork.title}
              >
                {artwork.title}
              </h3>

              {/* Status Badges dynamically based on pricing and pricing_type */}
              {badgeType === 'FOR_SALE' && (
                <span className="text-[10px] font-bold text-amber-950 dark:text-amber-300 bg-amber-400 dark:bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full shadow-sm flex-shrink-0">
                  {statusBadge}
                </span>
              )}
              {badgeType === 'BIDDING' && (
                <span className="text-[10px] font-bold text-white bg-orange-500 dark:bg-orange-500/25 dark:text-orange-300 border border-orange-500/50 px-2 py-0.5 rounded-full shadow-sm flex-shrink-0">
                  {statusBadge}
                </span>
              )}
              {badgeType === 'NOT_FOR_SALE' && (
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full flex-shrink-0">
                  {statusBadge}
                </span>
              )}
            </div>

            {/* Price / Starting Bid Line */}
            {badgeType === 'FOR_SALE' && (
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                Price: LKR {displayPrice.toLocaleString()}
              </p>
            )}
            {badgeType === 'BIDDING' && (
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-1">
                {fallbackDisplayPrice}
              </p>
            )}
            {badgeType === 'NOT_FOR_SALE' && (
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                {fallbackDisplayPrice}
              </p>
            )}

            {/* Artist & Lower Metadata Row with Ref ID */}
            <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 truncate max-w-[170px]">
                  {artistAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artistAvatarUrl}
                      alt={artistName}
                      className="w-3.5 h-3.5 rounded-full object-cover shrink-0 border border-amber-300/60"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <User className="w-3 h-3 text-amber-500 shrink-0" />
                  )}
                  <span className="truncate">{artistName}</span>
                </span>
                {/* Secondary sub-badge: only use 'Verified Artist' as a secondary sub-badge/subtitle, not replacing the artist's real name */}
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-1.5 py-0.5 rounded-md shrink-0">
                  Verified Artist
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Ref ID: {artwork.art_code || '#ART-101'}
              </span>
            </div>
          </div>

          {/* Stats & Actions: Like button, Rating badge, Expand */}
          <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              {/* Like Button */}
              <button
                type="button"
                onClick={handleLikeClick}
                disabled={toggleLikeMutation.isPending}
                aria-label={isLiked ? 'Unlike artwork' : 'Like artwork'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isLiked
                    ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 shadow-sm'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-300 hover:border-rose-300 dark:hover:border-rose-500/40'
                }`}
              >
                <Heart
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>{likesCount}</span>
                <span className="sr-only">likes</span>
              </button>

              {/* Rating Badge */}
              {(artwork.averageRating > 0 || (artwork.ratingsCount ?? 0) > 0) && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/25 shadow-sm"
                  title={`Average rating: ${artwork.averageRating} from ${artwork.ratingsCount} review(s)`}
                >
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {artwork.averageRating > 0 ? artwork.averageRating.toFixed(1) : '—'}
                  </span>
                  {artwork.ratingsCount > 0 && (
                    <span className="text-amber-600/75 dark:text-amber-400/75 text-[10px] font-normal">
                      ({artwork.ratingsCount})
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Expand / Details CTA */}
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                aria-label="View artwork details and comments"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 bg-white/80 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200/80 dark:border-slate-700/80 transition-all duration-200 cursor-pointer"
              >
                <ZoomIn className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Details</span>
              </button>

              {/* Owner / Admin Delete Button */}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  aria-label="Delete artwork"
                  title="Delete artwork"
                  className="inline-flex items-center justify-center p-1.5 rounded-full text-xs font-medium text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200 dark:hover:border-rose-800/50 transition-colors cursor-pointer"
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
        onClose={() => setIsZoomOpen(false)}
        artwork={artwork}
        artistName={artistName}
        likesCount={likesCount}
        isLiked={isLiked}
        onToggleLike={handleLikeClick}
      />
    </>
  );
}
