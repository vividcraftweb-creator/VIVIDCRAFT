'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, Star, ZoomIn, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/hooks/useAuth';

export interface ArtworkItem {
  id: string;
  artist_id: string;
  title: string;
  image_url: string;
  created_at: string;
  likesCount: number;
  isLiked: boolean;
  ratingsCount: number;
  averageRating: number;
  userRating: number | null;
}

interface ArtworkCardProps {
  artwork: ArtworkItem;
  artistName?: string;
}

export function ArtworkCard({ artwork, artistName }: ArtworkCardProps) {
  const router = useRouter();
  const { data: session, status } = useAuth();
  const isAuthenticated = status === 'authenticated' && !!session?.session?.user;

  // Local optimistic state for instant feedback
  const [likesCount, setLikesCount] = useState<number>(artwork.likesCount);
  const [isLiked, setIsLiked] = useState<boolean>(artwork.isLiked);
  const [ratingsCount, setRatingsCount] = useState<number>(artwork.ratingsCount);
  const [averageRating, setAverageRating] = useState<number>(artwork.averageRating);
  const [userRating, setUserRating] = useState<number | null>(artwork.userRating);

  const [hoverRating, setHoverRating] = useState<number | null>(null);
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

  const rateArtworkMutation = trpc.artworks.rateArtwork.useMutation({
    onSuccess: (data) => {
      setUserRating(data.userRating);
      setAverageRating(data.averageRating);
      setRatingsCount(data.ratingsCount);
      toast.success(`Rated ${data.userRating} out of 5 stars!`);
      utils.artworks.getArtistArtworks.invalidate({ artistId: artwork.artist_id });
    },
    onError: (err) => {
      setUserRating(artwork.userRating);
      setAverageRating(artwork.averageRating);
      setRatingsCount(artwork.ratingsCount);
      toast.error(err.message || 'Failed to submit rating');
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

  const handleRateClick = (starValue: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please sign in to rate this artwork', {
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

    // Optimistic rating
    const prevUserRating = userRating;
    const isNewRating = prevUserRating === null;
    const newRatingsCount = isNewRating ? ratingsCount + 1 : ratingsCount;
    const currentSum = averageRating * ratingsCount;
    const newSum = isNewRating
      ? currentSum + starValue
      : currentSum - (prevUserRating || 0) + starValue;
    const newAvg = Math.round((newSum / Math.max(1, newRatingsCount)) * 10) / 10;

    setUserRating(starValue);
    setAverageRating(newAvg);
    setRatingsCount(newRatingsCount);

    rateArtworkMutation.mutate({
      artworkId: artwork.id,
      rating: starValue,
    });
  };

  return (
    <>
      <div className="group relative rounded-2xl overflow-hidden glass-card glass-card-shine border border-white/10 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col bg-black/30">
        {/* Artwork Image Container */}
        <div
          className="relative aspect-[4/3] w-full overflow-hidden bg-black/60 cursor-pointer"
          onClick={() => setIsZoomOpen(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artwork.image_url}
            alt={artwork.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://via.placeholder.com/600x450?text=Artwork+Image';
            }}
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

          {/* Quick Zoom Preview Icon on Hover */}
          <div className="absolute top-3 right-3 p-2 rounded-xl bg-black/50 backdrop-blur-md text-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 hover:text-white">
            <ZoomIn className="h-4 w-4" />
          </div>

          {/* Title and Artist pill inside image bottom */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-white font-bold text-base sm:text-lg drop-shadow-md truncate">
              {artwork.title}
            </h3>
            {artistName && (
              <p className="text-xs text-white/75 drop-shadow truncate mt-0.5">
                by {artistName}
              </p>
            )}
          </div>
        </div>

        {/* Interactive Action Bar below image */}
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-black/40 border-t border-white/5">
          {/* Like Button */}
          <button
            type="button"
            onClick={handleLikeClick}
            disabled={toggleLikeMutation.isPending}
            aria-label={isLiked ? 'Unlike artwork' : 'Like artwork'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 interactive-scale ${
              isLiked
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-white/5 text-white/70 border border-white/10 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30'
            }`}
          >
            <Heart
              className={`h-4 w-4 transition-transform duration-200 ${
                isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-current'
              }`}
            />
            <span>{likesCount}</span>
            <span className="sr-only">likes</span>
          </button>

          {/* Star Rating Section */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const activeStar = hoverRating !== null ? hoverRating : (userRating || Math.round(averageRating));
                const isStarFilled = star <= activeStar;

                return (
                  <button
                    key={star}
                    type="button"
                    onClick={(e) => handleRateClick(star, e)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    aria-label={`Rate ${star} stars`}
                    className="p-0.5 text-white/30 hover:scale-125 transition-transform duration-150 focus:outline-none"
                  >
                    <Star
                      className={`h-4 w-4 transition-colors duration-150 ${
                        isStarFilled
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-white/20'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Rating Average & User Feedback */}
            <div className="flex items-center gap-1.5 text-[11px] text-white/50 mt-1">
              {averageRating > 0 ? (
                <>
                  <span className="font-semibold text-amber-300">
                    {averageRating.toFixed(1)}★
                  </span>
                  <span>({ratingsCount})</span>
                </>
              ) : (
                <span>No ratings yet</span>
              )}

              {userRating && (
                <span className="text-purple-300 border-l border-white/10 pl-1.5">
                  You: {userRating}★
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Expanded Artwork Modal */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col rounded-3xl overflow-hidden glass-card border border-white/20 bg-gray-950 p-2 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/90 border border-white/10 transition-colors"
              aria-label="Close artwork preview"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Large Image */}
            <div className="relative w-full h-[60vh] sm:h-[70vh] rounded-2xl overflow-hidden bg-black/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artwork.image_url}
                alt={artwork.title}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Modal Info Bar */}
            <div className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {artwork.title}
                </h2>
                {artistName && (
                  <p className="text-sm text-slate-300">Artist: {artistName}</p>
                )}
              </div>

              {/* Action items in modal */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleLikeClick}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isLiked
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-white/10 text-white/80 border border-white/10 hover:bg-rose-500/10 hover:text-rose-300'
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      isLiked ? 'fill-rose-500 text-rose-500' : ''
                    }`}
                  />
                  <span>{likesCount} Likes</span>
                </button>

                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-white">
                    {averageRating > 0 ? averageRating.toFixed(1) : 'Unrated'}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({ratingsCount} {ratingsCount === 1 ? 'rating' : 'ratings'})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
