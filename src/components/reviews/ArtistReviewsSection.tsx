'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star,
  Quote,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  CheckCircle2,
  X,
  MessageSquareHeart,
  LogIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/hooks/useAuth';

export interface ArtistReviewItem {
  id: string;
  artistId: string;
  clientId: string;
  rating: number;
  reviewText: string;
  createdAt: string;
  clientName: string;
  clientAvatar: string | null;
}

interface ArtistReviewsSectionProps {
  artistId: string;
  artistName: string;
  initialReviews?: ArtistReviewItem[];
}

export function ArtistReviewsSection({
  artistId,
  artistName,
  initialReviews = [],
}: ArtistReviewsSectionProps) {
  const router = useRouter();
  const { data: session, status } = useAuth();
  const isAuthenticated = status === 'authenticated' && !!session?.session?.user;
  const currentUserId = session?.session?.user?.id;
  const isOwnProfile = currentUserId === artistId;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: reviews = initialReviews, isLoading } =
    trpc.artworks.getArtistReviews.useQuery(
      { artistId },
      { initialData: initialReviews.length > 0 ? initialReviews : undefined }
    );

  const addReviewMutation = trpc.artworks.addArtistReview.useMutation({
    onSuccess: () => {
      toast.success('Thank you! Your review has been submitted.');
      setIsModalOpen(false);
      setReviewText('');
      setRating(5);
      utils.artworks.getArtistReviews.invalidate({ artistId });
    },
    onError: (err) => {
      toast.error(`Failed to submit review: ${err.message}`);
    },
  });

  const handleOpenReviewModal = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to write a review', {
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

    if (isOwnProfile) {
      toast.error('Artists cannot review their own profile');
      return;
    }

    setIsModalOpen(true);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please sign in to write a review');
      return;
    }

    if (isOwnProfile) {
      toast.error('Artists cannot review their own profile');
      return;
    }

    const trimmed = reviewText.trim();
    if (!trimmed) {
      toast.error('Please provide review comments');
      return;
    }

    addReviewMutation.mutate({
      artistId,
      rating,
      reviewText: trimmed,
    });
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Auto-scroll animation with hover pause
  useEffect(() => {
    if (!scrollContainerRef.current || reviews.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const maxScroll = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: 360, behavior: 'smooth' });
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [reviews.length, isHovered]);

  // Calculations
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? Math.round(
          (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / totalReviews) * 10
        ) / 10
      : 0;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <section className="glass-card glass-card-shine p-6 sm:p-8 rounded-2xl sm:rounded-3xl hover-lift space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 icon-glow transition-all duration-300">
            <MessageSquareHeart className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-wider uppercase text-white flex items-center gap-2">
              Client Reviews &amp; Testimonials
            </h2>
            <p className="text-xs text-white/60 mt-0.5">
              Verified client experiences, commissions, and ratings for {artistName}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {totalReviews > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{averageRating.toFixed(1)}</span>
              <span className="text-white/40">
                ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}

          {!isOwnProfile && (
            <button
              type="button"
              onClick={handleOpenReviewModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Write Review</span>
            </button>
          )}

          {/* Carousel Arrows */}
          {totalReviews > 2 && (
            <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-white/10">
              <button
                type="button"
                onClick={() => scroll('left')}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
                aria-label="Previous review"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
                aria-label="Next review"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Content */}
      {isLoading && reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-white/50">
          <Loader2 className="h-7 w-7 animate-spin text-purple-400 mb-2" />
          <p className="text-xs">Loading client reviews...</p>
        </div>
      ) : totalReviews > 0 ? (
        <div className="relative group">
          {/* Scrollable Track */}
          <div
            ref={scrollContainerRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={() => setIsHovered(true)}
            onTouchEnd={() => setIsHovered(false)}
            className="flex gap-4 sm:gap-5 overflow-x-auto scroll-smooth pb-3 pt-1 -mx-2 px-2 scrollbar-none snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {reviews.map((rev) => {
              const initial = (rev.clientName || 'C').charAt(0).toUpperCase();

              return (
                <article
                  key={rev.id}
                  className="w-[290px] sm:w-[350px] md:w-[380px] flex-shrink-0 snap-start flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-black/40 border border-white/10 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/5 group/card"
                >
                  {/* Card Top: Stars + Quote + Date */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${
                              s <= rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-white/20'
                            }`}
                          />
                        ))}
                      </div>
                      <Quote className="h-5 w-5 text-purple-400/40 group-hover/card:text-purple-400/80 transition-colors" />
                    </div>

                    {/* Review text */}
                    <p className="text-xs sm:text-sm text-white/85 leading-relaxed line-clamp-4 italic">
                      &ldquo;{rev.reviewText}&rdquo;
                    </p>
                  </div>

                  {/* Card Bottom: Client Info */}
                  <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-white/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {rev.clientAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rev.clientAvatar}
                          alt={rev.clientName}
                          className="h-8 w-8 rounded-full object-cover border border-white/15 flex-shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-600 to-amber-600 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0">
                          {initial}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <h3 className="text-xs font-semibold text-white truncate">
                            {rev.clientName}
                          </h3>
                          <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                        </div>
                        <p className="text-[10px] text-white/40">Verified Buyer</p>
                      </div>
                    </div>

                    <time className="text-[10px] text-white/40 flex-shrink-0">
                      {formatDate(rev.createdAt)}
                    </time>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-10 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 space-y-3">
          <MessageSquareHeart className="h-10 w-10 text-white/20 mx-auto" />
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-white/80">
              No client reviews yet
            </h3>
            <p className="text-xs text-white/50 mt-1">
              Have you commissioned or worked with {artistName}? Be the first to share your experience!
            </p>
          </div>
          {!isOwnProfile && (
            <button
              type="button"
              onClick={handleOpenReviewModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all mt-2"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Write First Review</span>
            </button>
          )}
        </div>
      )}

      {/* Review Submission Modal Dialog */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-lg w-full rounded-3xl overflow-hidden glass-card border border-white/20 bg-slate-950 p-6 sm:p-8 space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-black/90 border border-white/10 transition-colors"
              aria-label="Close review dialog"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                Write a Review
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Share your feedback on artworks or commissions completed by <span className="font-semibold text-white">{artistName}</span>.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitReview} className="space-y-5">
              {/* Star Rating Picker */}
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-2">
                  Overall Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = hoverRating !== null ? hoverRating : rating;
                    const isFilled = star <= active;

                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        aria-label={`Select ${star} stars`}
                        className="p-1 text-white/30 hover:scale-125 transition-transform focus:outline-none"
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                              : 'text-white/20'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-sm font-bold text-amber-300 ml-2">
                    {rating} of 5 Stars
                  </span>
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label htmlFor="review-text" className="block text-xs font-semibold text-white/80 mb-2">
                  Your Review / Testimonial
                </label>
                <textarea
                  id="review-text"
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Describe the artist's professionalism, creativity, artwork quality, or communication..."
                  maxLength={2000}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 resize-none transition-colors"
                />
                <div className="flex justify-between items-center text-[10px] text-white/40 mt-1">
                  <span>Minimum 5 characters</span>
                  <span>{reviewText.length}/2000</span>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addReviewMutation.isPending || !reviewText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5"
                >
                  {addReviewMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Review</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
