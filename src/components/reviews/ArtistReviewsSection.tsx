'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/hooks/useAuth';
import { isValidImageUrl } from '@/lib/image-placeholders';
import { createClient } from '@/lib/supabase/client';

export interface ArtistReviewItem {
  id: string;
  artistId: string;
  clientId: string;
  rating: number;
  comment: string;
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
  const isOwnProfile = Boolean(currentUserId && currentUserId === artistId);
  // Review form is visible ONLY to logged-in Clients (where user.id !== artist.id)
  const isClient = Boolean(isAuthenticated && currentUserId && currentUserId !== artistId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Direct state for reviews fetched from 'reviews' table
  const [tableReviews, setTableReviews] = useState<ArtistReviewItem[]>(() => {
    return Array.isArray(initialReviews) ? initialReviews : [];
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const isArtistIdValid = typeof artistId === 'string' && artistId.trim().length > 0;

  // 1. Query existing reviews matching artist_id via tRPC
  const { data: rawReviews, isLoading, refetch: refetchTrpc } =
    trpc.artworks.getArtistReviews.useQuery(
      { artistId: isArtistIdValid ? artistId : '' },
      {
        enabled: isArtistIdValid,
        initialData: initialReviews.length > 0 ? initialReviews : undefined,
        staleTime: 60000,
        retry: false,
      }
    );

  // 2. Direct fetch from 'reviews' table matching artist_id
  const fetchReviewsFromTable = useCallback(async () => {
    if (!isArtistIdValid) return;
    try {
      const supabase = createClient();
      const { data: dbReviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Direct reviews table query notice:', error.message);
        return;
      }

      if (dbReviews && dbReviews.length > 0) {
        const clientIds = Array.from(new Set(dbReviews.map((r: any) => r.client_id).filter(Boolean)));
        const profilesMap: Record<string, { name: string; avatarUrl: string | null }> = {};
        if (clientIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, avatar_url')
            .in('id', clientIds);
          if (profiles) {
            profiles.forEach((p: any) => {
              const fName = p.first_name || '';
              const lName = p.last_name || '';
              const name = p.full_name || `${fName} ${lName}`.trim() || 'Verified Client';
              profilesMap[p.id] = { name, avatarUrl: p.avatar_url || null };
            });
          }
        }
        const mapped = dbReviews.map((r: any) => {
          const text = r.comment || r.review_text || '';
          return {
            id: r.id,
            artistId: r.artist_id,
            clientId: r.client_id,
            rating: Number(r.rating) || 5,
            comment: text,
            reviewText: text,
            createdAt: r.created_at,
            clientName: profilesMap[r.client_id]?.name || 'Verified Client',
            clientAvatar: profilesMap[r.client_id]?.avatarUrl || null,
          };
        });
        setTableReviews(mapped);
      }
    } catch (err) {
      console.warn('fetchReviewsFromTable exception:', err);
    }
  }, [artistId, isArtistIdValid]);

  useEffect(() => {
    fetchReviewsFromTable();
  }, [fetchReviewsFromTable]);

  useEffect(() => {
    if (Array.isArray(rawReviews) && rawReviews.length > 0) {
      setTableReviews(rawReviews);
    }
  }, [rawReviews]);

  // Combined reviews list
  const reviews: ArtistReviewItem[] =
    tableReviews.length > 0
      ? tableReviews
      : (Array.isArray(rawReviews) && rawReviews.length > 0
        ? rawReviews
        : (Array.isArray(initialReviews) ? initialReviews : []));

  const addReviewMutation = trpc.artworks.addArtistReview.useMutation({
    onSuccess: () => {
      utils.artworks.getArtistReviews.invalidate({ artistId });
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

  // Submit handler: inserts { artist_id, client_id: user.id, rating, comment } into reviews table
  // and refetches reviews immediately to show the new comment
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !currentUserId) {
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

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const insertPayload = {
        artist_id: artistId,
        client_id: currentUserId,
        rating,
        comment: trimmed,
      };

      // Direct insert into reviews table
      const { data: inserted, error: insertError } = await supabase
        .from('reviews')
        .insert(insertPayload)
        .select('*')
        .maybeSingle();

      if (insertError) {
        console.warn('Direct reviews table insert notice, trying mutation fallback:', insertError.message);
        await addReviewMutation.mutateAsync({
          artistId,
          rating,
          comment: trimmed,
        });
      }

      toast.success('Thank you! Your review has been submitted.');
      setReviewText('');
      setRating(5);
      setIsModalOpen(false);

      // Refetch reviews immediately to show the new comment
      await Promise.all([
        fetchReviewsFromTable(),
        refetchTrpc(),
        utils.artworks.getArtistReviews.invalidate({ artistId }),
      ]);
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      toast.error(err?.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 icon-glow transition-all duration-300">
            <MessageSquareHeart className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-wider uppercase text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Client Reviews &amp; Testimonials
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Verified client experiences, commissions, and ratings for {artistName}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {totalReviews > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{averageRating.toFixed(1)}</span>
              <span className="text-zinc-500 dark:text-zinc-400">
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
            <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => scroll('left')}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
                aria-label="Previous review"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
                aria-label="Next review"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Review Form - Visible ONLY to logged-in Clients (where user.id !== artist.id) */}
      {isClient ? (
        <form
          onSubmit={handleSubmitReview}
          className="rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 space-y-4 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                <span>Rate &amp; Review {artistName}</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Share your feedback from your commission or project experience
              </p>
            </div>

            {/* Star Rating Selector */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-300 mr-1">
                {rating} Star{rating > 1 ? 's' : ''}
              </span>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => {
                  const activeStar = hoverRating !== null ? hoverRating : rating;
                  const isFilled = star <= activeStar;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      className="p-1 text-zinc-300 dark:text-zinc-600 hover:scale-125 transition-transform focus:outline-none"
                    >
                      <Star
                        className={`h-5 w-5 transition-colors ${
                          isFilled ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]' : 'text-zinc-300 dark:text-zinc-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Comment Text Area */}
          <div>
            <textarea
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={`Write your honest review and testimonial for ${artistName}...`}
              maxLength={2000}
              required
              className="w-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 placeholder:text-zinc-400 rounded-xl p-4 text-xs sm:text-sm focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60 resize-none transition-all shadow-sm"
            />
            <div className="flex justify-between items-center text-[10px] text-zinc-500 dark:text-zinc-400 mt-1.5 px-1">
              <span>Your feedback will be published on this artist&apos;s public profile.</span>
              <span>{reviewText.length}/2000</span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !reviewText.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Posting Review...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : !isAuthenticated ? (
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              <LogIn className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Worked with {artistName}?</p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">Log in as a client to leave a star rating and review.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/auth/signin?callbackUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`)}
            className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition-colors shadow-sm"
          >
            Sign In to Review
          </button>
        </div>
      ) : null}

      {/* Reviews Content */}
      {isLoading && reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-7 w-7 animate-spin text-purple-600 dark:text-purple-400 mb-2" />
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
                  className="w-[290px] sm:w-[350px] md:w-[380px] flex-shrink-0 snap-start flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-purple-400 dark:hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md group/card"
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
                                : 'text-zinc-300 dark:text-zinc-600'
                            }`}
                          />
                        ))}
                      </div>
                      <Quote className="h-5 w-5 text-purple-400/40 group-hover/card:text-purple-600 dark:group-hover/card:text-purple-400 transition-colors" />
                    </div>

                    {/* Review text */}
                    <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-4 italic">
                      &ldquo;{rev.comment || rev.reviewText}&rdquo;
                    </p>
                  </div>

                  {/* Card Bottom: Client Info */}
                  <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                        {rev.clientAvatar && isValidImageUrl(rev.clientAvatar) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={rev.clientAvatar}
                            alt={rev.clientName}
                            className="h-full w-full rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="h-full w-full rounded-full bg-gradient-to-tr from-purple-600 to-amber-600 flex items-center justify-center text-xs font-bold text-white uppercase border border-zinc-200 dark:border-zinc-700"
                          style={{ display: (rev.clientAvatar && isValidImageUrl(rev.clientAvatar)) ? 'none' : 'flex' }}
                        >
                          {initial}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {rev.clientName}
                          </h3>
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Verified Buyer</p>
                      </div>
                    </div>

                    <time className="text-[10px] text-zinc-500 dark:text-zinc-400 flex-shrink-0" suppressHydrationWarning>
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
        <div className="text-center py-10 px-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/20 border border-dashed border-zinc-300 dark:border-zinc-800 space-y-3">
          <MessageSquareHeart className="h-10 w-10 text-zinc-400 dark:text-zinc-600 mx-auto" />
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No client reviews yet
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-lg w-full rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 transition-colors"
              aria-label="Close review dialog"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Star className="h-5 w-5 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                Write a Review
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Share your feedback on artworks or commissions completed by <span className="font-semibold text-zinc-900 dark:text-zinc-100">{artistName}</span>.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitReview} className="space-y-5">
              {/* Star Rating Picker */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
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
                        className="p-1 text-zinc-300 dark:text-zinc-600 hover:scale-125 transition-transform focus:outline-none"
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                              : 'text-zinc-300 dark:text-zinc-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400 ml-2">
                    {rating} of 5 Stars
                  </span>
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label htmlFor="review-text" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
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
                  className="w-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 placeholder:text-zinc-400 rounded-2xl p-4 text-xs sm:text-sm focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60 resize-none transition-colors"
                />
                <div className="flex justify-between items-center text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  <span>Minimum 5 characters</span>
                  <span>{reviewText.length}/2000</span>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition-colors"
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
