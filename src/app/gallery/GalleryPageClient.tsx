'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Star,
  Flame,
  Clock,
  Sparkles,
  Search,
  Maximize2,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Image as ImageIcon,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { createClient } from '@/lib/supabase/client';
import { getSafeArtworkUrl, DEFAULT_ARTWORK_PLACEHOLDER } from '@/lib/image-placeholders';
import { getProfilePictureUrl } from '@/lib/profile-helpers';

type SortOption = 'popular' | 'highest_rated' | 'most_liked' | 'newest';

interface ArtworkArtist {
  id: string;
  name: string;
  avatar_url: string | null;
  title?: string;
  role?: string;
}

interface RankedArtwork {
  id: string;
  artist_id: string;
  title: string;
  image_url: string;
  created_at: string;
  likesCount: number;
  ratingsCount: number;
  averageRating: number;
  userRating: number | null;
  isLiked: boolean;
  popularityScore?: number;
  artist: ArtworkArtist;
}

export default function GalleryPageClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeSort, setActiveSort] = useState<SortOption>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState<RankedArtwork | null>(null);
  const [hoveredRating, setHoveredRating] = useState<{ [key: string]: number }>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Local state for instant optimistic updates
  const [localArtworks, setLocalArtworks] = useState<RankedArtwork[]>([]);

  // Fetch current user
  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    }).catch(() => {
      setCurrentUserId(null);
    });
  }, []);

  // Fetch via tRPC procedure
  const { data: remoteArtworks, isLoading, refetch } = trpc.artworks.getAllArtworks.useQuery(
    { sort: activeSort, search: searchQuery },
    {
      refetchOnWindowFocus: false,
    }
  );

  // Mutations
  const utils = trpc.useUtils();

  const toggleLikeMutation = trpc.artworks.toggleLike.useMutation({
    onError: (err, variables) => {
      // Revert optimistic update
      toast.error('Failed to update like: ' + err.message);
      refetch();
    },
    onSuccess: () => {
      utils.artworks.getAllArtworks.invalidate();
    },
  });

  const rateArtworkMutation = trpc.artworks.rateArtwork.useMutation({
    onSuccess: (data) => {
      toast.success('Thank you for rating!', {
        description: `You gave ${data.userRating} stars. Average: ${data.averageRating}★`,
      });
      utils.artworks.getAllArtworks.invalidate();
    },
    onError: (err) => {
      toast.error('Failed to submit rating: ' + err.message);
      refetch();
    },
  });

  // Sync remote data into local state
  useEffect(() => {
    if (remoteArtworks) {
      setLocalArtworks(remoteArtworks as RankedArtwork[]);
    }
  }, [remoteArtworks]);

  // Fallback direct Supabase fetch if tRPC returned empty on first load
  useEffect(() => {
    if (!isLoading && (!remoteArtworks || remoteArtworks.length === 0)) {
      const supabase = createClient();
      async function fetchDirect() {
        try {
          const { data: arts } = await supabase
            .from('artworks')
            .select('*')
            .order('created_at', { ascending: false });

          if (arts && arts.length > 0) {
            const artIds = arts.map((a: any) => a.id);
            const artistIds = Array.from(new Set(arts.map((a: any) => a.artist_id).filter(Boolean)));

            const [likesRes, ratingsRes, profilesRes] = await Promise.all([
              supabase.from('artwork_likes').select('artwork_id, user_id').in('artwork_id', artIds),
              supabase.from('artwork_ratings').select('artwork_id, user_id, rating').in('artwork_id', artIds),
              artistIds.length > 0
                ? supabase.from('profiles').select('id, first_name, last_name, full_name, avatar_url, role, title').in('id', artistIds)
                : Promise.resolve({ data: [] }),
            ]);

            const likes = likesRes.data || [];
            const ratings = ratingsRes.data || [];
            const profiles = profilesRes.data || [];
            const pMap = new Map<string, any>();
            profiles.forEach((p: any) => pMap.set(p.id, p));

            const mapped: RankedArtwork[] = arts.map((art: any) => {
              const artLikes = likes.filter((l: any) => l.artwork_id === art.id);
              const artRatings = ratings.filter((r: any) => r.artwork_id === art.id);
              const isLiked = currentUserId ? artLikes.some((l: any) => l.user_id === currentUserId) : false;
              const userRatingRow = currentUserId ? artRatings.find((r: any) => r.user_id === currentUserId) : null;

              const ratingsSum = artRatings.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
              const avg = artRatings.length > 0 ? Math.round((ratingsSum / artRatings.length) * 10) / 10 : 0;
              const prof = pMap.get(art.artist_id);
              const artistName = prof?.full_name || [prof?.first_name, prof?.last_name].filter(Boolean).join(' ') || 'Featured Artist';

              return {
                id: art.id,
                artist_id: art.artist_id,
                title: art.title || 'Untitled Artwork',
                image_url: art.image_url,
                created_at: art.created_at,
                likesCount: artLikes.length,
                ratingsCount: artRatings.length,
                averageRating: avg,
                userRating: userRatingRow ? Number(userRatingRow.rating) : null,
                isLiked,
                popularityScore: artLikes.length * 3 + avg * Math.log2(artRatings.length + 2) * 4,
                artist: {
                  id: art.artist_id,
                  name: artistName,
                  avatar_url: prof?.avatar_url || null,
                  title: prof?.title || 'Artist / Creator',
                  role: prof?.role || 'artist',
                },
              };
            });
            setLocalArtworks(mapped);
          }
        } catch (e) {
          console.warn('Fallback direct fetch error:', e);
        }
      }
      fetchDirect();
    }
  }, [isLoading, remoteArtworks, currentUserId]);

  // Client-side filtering and sorting for instant responsiveness
  const displayedArtworks = useMemo(() => {
    let list = [...localArtworks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (art) =>
          art.title.toLowerCase().includes(q) ||
          art.artist.name.toLowerCase().includes(q)
      );
    }

    if (activeSort === 'popular') {
      list.sort((a, b) => {
        const scoreA =
          (a.popularityScore ?? a.likesCount * 3 + a.averageRating * Math.log2(a.ratingsCount + 2) * 4);
        const scoreB =
          (b.popularityScore ?? b.likesCount * 3 + b.averageRating * Math.log2(b.ratingsCount + 2) * 4);
        return scoreB - scoreA || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (activeSort === 'highest_rated') {
      list.sort(
        (a, b) =>
          b.averageRating - a.averageRating ||
          b.ratingsCount - a.ratingsCount ||
          b.likesCount - a.likesCount
      );
    } else if (activeSort === 'most_liked') {
      list.sort(
        (a, b) => b.likesCount - a.likesCount || b.averageRating - a.averageRating
      );
    } else if (activeSort === 'newest') {
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return list;
  }, [localArtworks, searchQuery, activeSort]);

  // Handle Interactive Like
  const handleLike = useCallback(
    async (artworkId: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }

      if (!currentUserId) {
        toast.info('Sign in required', {
          description: 'Please sign in or create an account to like artworks.',
          action: {
            label: 'Sign In',
            onClick: () => router.push(`/auth/signin?callbackUrl=/gallery`),
          },
        });
        return;
      }

      // Optimistic update
      setLocalArtworks((prev) =>
        prev.map((art) => {
          if (art.id === artworkId) {
            const nextIsLiked = !art.isLiked;
            const nextLikesCount = nextIsLiked
              ? art.likesCount + 1
              : Math.max(0, art.likesCount - 1);
            return {
              ...art,
              isLiked: nextIsLiked,
              likesCount: nextLikesCount,
            };
          }
          return art;
        })
      );

      // If selected in modal, update modal state too
      if (selectedArtwork && selectedArtwork.id === artworkId) {
        setSelectedArtwork((prev) =>
          prev
            ? {
                ...prev,
                isLiked: !prev.isLiked,
                likesCount: !prev.isLiked
                  ? prev.likesCount + 1
                  : Math.max(0, prev.likesCount - 1),
              }
            : null
        );
      }

      // Trigger mutation
      toggleLikeMutation.mutate({ artworkId });
    },
    [currentUserId, router, selectedArtwork, toggleLikeMutation]
  );

  // Handle Interactive Rating
  const handleRate = useCallback(
    async (artworkId: string, rating: number, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }

      if (!currentUserId) {
        toast.info('Sign in required', {
          description: 'Please sign in to rate this artwork.',
          action: {
            label: 'Sign In',
            onClick: () => router.push(`/auth/signin?callbackUrl=/gallery`),
          },
        });
        return;
      }

      // Optimistic rating update
      setLocalArtworks((prev) =>
        prev.map((art) => {
          if (art.id === artworkId) {
            const previousRating = art.userRating;
            let newRatingsCount = art.ratingsCount;
            let newSum = art.averageRating * art.ratingsCount;

            if (previousRating !== null) {
              // Update existing rating
              newSum = newSum - previousRating + rating;
            } else {
              // New rating
              newRatingsCount += 1;
              newSum += rating;
            }

            const newAvg =
              newRatingsCount > 0
                ? Math.round((newSum / newRatingsCount) * 10) / 10
                : rating;

            return {
              ...art,
              userRating: rating,
              averageRating: newAvg,
              ratingsCount: newRatingsCount,
            };
          }
          return art;
        })
      );

      if (selectedArtwork && selectedArtwork.id === artworkId) {
        setSelectedArtwork((prev) =>
          prev
            ? {
                ...prev,
                userRating: rating,
              }
            : null
        );
      }

      rateArtworkMutation.mutate({ artworkId, rating });
    },
    [currentUserId, rateArtworkMutation, router, selectedArtwork]
  );

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-28 pb-24 relative overflow-hidden">
      {/* Background aesthetic gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-purple-600/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-48 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-semibold tracking-wide uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            Vivid Art Gallery & Exhibition
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Curated Artworks & Portfolios
          </h1>

          <p className="text-base sm:text-lg text-slate-400 font-normal">
            Discover ranked original creations from verified artists. Like your favorites, rate remarkable pieces, and commission top talent.
          </p>

          {/* Search Bar */}
          <div className="pt-2 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search artworks by title or artist name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 h-12 bg-slate-900/80 backdrop-blur-md border border-slate-800 focus:border-purple-500 rounded-2xl text-white placeholder:text-slate-500 text-sm shadow-xl focus:ring-2 focus:ring-purple-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs bg-slate-800 px-2 py-1 rounded-md"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Filter Tabs / Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveSort('popular')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeSort === 'popular'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Most Popular</span>
            </button>

            <button
              onClick={() => setActiveSort('highest_rated')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeSort === 'highest_rated'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Highest Rated</span>
            </button>

            <button
              onClick={() => setActiveSort('most_liked')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeSort === 'most_liked'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
              <span>Most Liked</span>
            </button>

            <button
              onClick={() => setActiveSort('newest')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeSort === 'newest'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Newest</span>
            </button>
          </div>

          {/* Counter info */}
          <div className="text-xs sm:text-sm text-slate-400 font-medium">
            Showing <span className="text-white font-semibold">{displayedArtworks.length}</span> artworks
          </div>
        </div>

        {/* Gallery Grid */}
        {isLoading && localArtworks.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-slate-800/60" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-800" />
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedArtworks.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 border border-slate-800 border-dashed rounded-3xl max-w-2xl mx-auto p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">No Artworks Found</h3>
            <p className="text-sm text-slate-400">
              {searchQuery
                ? `No artworks matched your search query "${searchQuery}". Try a different keyword.`
                : 'No artworks have been uploaded yet. Artists can upload their pieces from the artist dashboard.'}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="border-slate-700 text-white hover:bg-slate-800"
              >
                Reset Filter
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedArtworks.map((artwork) => {
              const safeImg = getSafeArtworkUrl(artwork.image_url);
              const artistAvatar = getProfilePictureUrl(artwork.artist_id, artwork.artist.avatar_url);
              const initials = artwork.artist.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              const activeHoverStar = hoveredRating[artwork.id] || 0;

              return (
                <div
                  key={artwork.id}
                  className="group relative bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-purple-500/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col"
                >
                  {/* Image Preview Container */}
                  <div
                    onClick={() => setSelectedArtwork(artwork)}
                    className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950 cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={safeImg}
                      alt={artwork.title}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = DEFAULT_ARTWORK_PLACEHOLDER;
                      }}
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Top hover action: Maximize button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedArtwork(artwork);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:bg-purple-600 hover:border-purple-500 cursor-pointer"
                      title="View full screen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>

                    {/* Bottom hover action: Quick Rate Stars */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-between bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                    >
                      <span className="text-[11px] text-slate-300 font-medium">Rate this piece:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() =>
                              setHoveredRating((prev) => ({ ...prev, [artwork.id]: star }))
                            }
                            onMouseLeave={() =>
                              setHoveredRating((prev) => ({ ...prev, [artwork.id]: 0 }))
                            }
                            onClick={(e) => handleRate(artwork.id, star, e)}
                            className="p-0.5 hover:scale-125 transition-transform text-slate-400 cursor-pointer"
                            title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          >
                            <Star
                              className={`w-3.5 h-3.5 transition-colors ${
                                (activeHoverStar >= star) ||
                                (!activeHoverStar && artwork.userRating && artwork.userRating >= star)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-500'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Artwork Card Body */}
                  <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                    <div>
                      {/* Title */}
                      <h3
                        onClick={() => setSelectedArtwork(artwork)}
                        className="text-white font-bold text-base truncate cursor-pointer hover:text-purple-300 transition-colors"
                        title={artwork.title}
                      >
                        {artwork.title}
                      </h3>

                      {/* Artist Row */}
                      <div className="flex items-center gap-2.5 mt-2">
                        <Link
                          href={`/freelancers/${artwork.artist_id}`}
                          className="flex-shrink-0 group/avatar"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Avatar className="w-7 h-7 ring-1 ring-purple-500/30 group-hover/avatar:ring-purple-400 transition-all">
                            {artistAvatar && <AvatarImage src={artistAvatar} alt={artwork.artist.name} />}
                            <AvatarFallback className="bg-purple-900/60 text-purple-200 text-xs font-semibold">
                              {initials || <User className="w-3.5 h-3.5" />}
                            </AvatarFallback>
                          </Avatar>
                        </Link>

                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/freelancers/${artwork.artist_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-semibold text-slate-200 hover:text-white truncate block group-hover:text-purple-300 transition-colors"
                          >
                            {artwork.artist.name}
                          </Link>
                          <p className="text-[11px] text-slate-500 truncate">
                            {artwork.artist.title || 'Creator'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Actions Footer */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      {/* Interactive Like Button */}
                      <button
                        type="button"
                        onClick={(e) => handleLike(artwork.id, e)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          artwork.isLiked
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 font-semibold'
                            : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30'
                        }`}
                        title={artwork.isLiked ? 'Unlike artwork' : 'Like artwork'}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 transition-transform active:scale-125 ${
                            artwork.isLiked ? 'fill-rose-500 text-rose-500' : ''
                          }`}
                        />
                        <span>{artwork.likesCount}</span>
                      </button>

                      {/* Average Rating Display */}
                      <div
                        className="inline-flex items-center gap-1 text-slate-300 font-medium px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
                        title={`Average rating: ${artwork.averageRating} from ${artwork.ratingsCount} review(s)`}
                      >
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-semibold text-white">
                          {artwork.averageRating > 0 ? artwork.averageRating.toFixed(1) : '—'}
                        </span>
                        {artwork.ratingsCount > 0 && (
                          <span className="text-slate-500 text-[10px]">({artwork.ratingsCount})</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lightbox / Modal View */}
        {selectedArtwork && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
            onClick={() => setSelectedArtwork(null)}
          >
            <div
              className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9 ring-1 ring-purple-500/30">
                    <AvatarImage
                      src={getProfilePictureUrl(selectedArtwork.artist_id, selectedArtwork.artist.avatar_url)}
                      alt={selectedArtwork.artist.name}
                    />
                    <AvatarFallback className="bg-purple-950 text-purple-200 text-xs">
                      {selectedArtwork.artist.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-white text-sm sm:text-base leading-tight">
                      {selectedArtwork.title}
                    </h4>
                    <Link
                      href={`/freelancers/${selectedArtwork.artist_id}`}
                      className="text-xs text-purple-400 hover:text-purple-300 hover:underline"
                    >
                      by {selectedArtwork.artist.name}
                    </Link>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedArtwork(null)}
                  className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Image Display */}
              <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getSafeArtworkUrl(selectedArtwork.image_url)}
                  alt={selectedArtwork.title}
                  className="max-h-[60vh] w-auto max-w-full object-contain"
                />
              </div>

              {/* Modal Actions Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                  {/* Like Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleLike(selectedArtwork.id, e)}
                    className={`gap-2 border-slate-700 h-10 px-4 ${
                      selectedArtwork.isLiked
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                        : 'text-white hover:bg-rose-500/10 hover:border-rose-500/30'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        selectedArtwork.isLiked ? 'fill-rose-500 text-rose-500' : ''
                      }`}
                    />
                    <span>{selectedArtwork.likesCount} Likes</span>
                  </Button>

                  {/* Rating Score */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-white text-sm">
                      {selectedArtwork.averageRating > 0
                        ? selectedArtwork.averageRating.toFixed(1)
                        : 'Unrated'}
                    </span>
                    <span className="text-slate-400">({selectedArtwork.ratingsCount} reviews)</span>
                  </div>
                </div>

                {/* Direct Action: View Profile */}
                <Link
                  href={`/freelancers/${selectedArtwork.artist_id}`}
                  className="w-full sm:w-auto"
                >
                  <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold gap-2 h-10 px-5">
                    <span>Commission / Contact Artist</span>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
