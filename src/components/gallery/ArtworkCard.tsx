'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, ZoomIn, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/hooks/useAuth';
import { ArtworkModal } from './ArtworkModal';
import { getSafeArtworkUrl, DEFAULT_ARTWORK_PLACEHOLDER } from '@/lib/image-placeholders';

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
            src={getSafeArtworkUrl(artwork.image_url)}
            alt={artwork.title || 'Artwork'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = DEFAULT_ARTWORK_PLACEHOLDER;
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

          {/* Expand / Comments CTA */}
          <button
            type="button"
            onClick={() => setIsZoomOpen(true)}
            aria-label="View artwork details and comments"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-200"
          >
            <ZoomIn className="h-3.5 w-3.5 text-purple-400" />
            <span>Feedback</span>
          </button>
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
