'use client';

import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle,
  Search,
  Heart,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trackEvent } from '@/utils/analytics';
import { createClient } from '@/lib/supabase/client';
import { trpc } from '@/utils/trpc';
import { getPublicUrl } from '@/lib/profile-helpers';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import type { ArtworkItem } from '@/components/gallery/ArtworkCard';
import { HomeHeroSlider } from '@/components/HomeHeroSlider';
import { formatBadgeWithDiamonds, formatGigTitle } from '@/lib/artworks';
import { DEFAULT_ARTWORK_PLACEHOLDER, getSafeArtworkUrl } from '@/lib/image-placeholders';

// Curated high-resolution fallback artwork thumbnails for featured creator cards
const CURATED_GIG_THUMBNAILS = [
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1578925518470-4def7a0f08bb?auto=format&fit=crop&w=800&q=80',
];

export function HomeHero() {
  const router = useRouter();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Horizontal artist slider ref
  const sliderRef = useRef<HTMLDivElement>(null);

  // Top Manual-Ordered Artists state with attached artworks
  const [artists, setArtists] = useState<any[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(true);

  // Top-Rated / Most Liked Artworks state
  const { data: trpcArtworks, isLoading: trpcLoading } = trpc.artworks.getAllArtworks.useQuery(
    { sort: 'popular', mode: 'ALL' },
    { refetchOnWindowFocus: false }
  );
  const [fallbackArtworks, setFallbackArtworks] = useState<any[]>([]);
  const [loadingFallback, setLoadingFallback] = useState(false);

  // Local state for wishlist heart toggle on featured gig cards
  const [likedGigs, setLikedGigs] = useState<Record<string, boolean>>({});

  const toggleGigLike = useCallback((e: React.MouseEvent, artistId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLikedGigs((prev) => ({
      ...prev,
      [artistId]: !prev[artistId],
    }));
  }, []);

  // Fetch top artists (ONLY artists where show_on_home = true, strictly sorted by display_order ASC)
  useEffect(() => {
    let isMounted = true;
    async function fetchTopArtists() {
      setLoadingArtists(true);
      try {
        const supabase = createClient();
        let { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, role, avatar_url, display_order, show_on_home, is_verified, title, professional_title')
          .eq('show_on_home', true)
          .or('role.eq.artist,role.eq.ARTIST,is_artist.eq.true')
          .neq('role', 'client')
          .neq('role', 'CLIENT')
          .neq('role', 'admin')
          .neq('role', 'ADMIN')
          .order('display_order', { ascending: true });

        // Fallback if is_artist column does not exist on remote database yet
        if (error) {
          console.warn('HomeHero artist query notice (falling back):', error.message);
          const fallback = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, role, avatar_url, display_order, show_on_home, is_verified, title, professional_title')
            .eq('show_on_home', true)
            .or('role.eq.artist,role.eq.ARTIST,role.ilike.%artist%')
            .neq('role', 'client')
            .neq('role', 'CLIENT')
            .neq('role', 'admin')
            .neq('role', 'ADMIN')
            .order('display_order', { ascending: true });

          if (!fallback.error && fallback.data) {
            data = fallback.data;
            error = null;
          }
        }

        if (!error && Array.isArray(data)) {
          // Strict client-side filter: only artist role / is_artist, strictly exclude client and admin
          const validArtists = data.filter((p: any) => {
            const role = (p.role || '').toLowerCase();
            const isArtist = Boolean(p.is_artist);
            if (role === 'client' || role === 'admin') return false;
            return role === 'artist' || isArtist || role.includes('artist');
          });

          const sorted = [...validArtists].sort(
            (a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0)
          );

          // Fetch associated artworks to attach to gig cards
          const artistIds = sorted.map((a: any) => a.id).filter(Boolean);
          const artworksByArtist: Record<string, any> = {};

          if (artistIds.length > 0) {
            try {
              const { data: arts } = await supabase
                .from('artworks')
                .select('id, artist_id, user_id, title, gig_title, badge_title, base_rating, review_count_text, image_url, price, amount, likes_count, rating_score')
                .in('artist_id', artistIds);

              if (arts && arts.length > 0) {
                for (const art of arts) {
                  const aid = art.artist_id || art.user_id;
                  if (aid && (!artworksByArtist[aid] || (art.likes_count ?? 0) > (artworksByArtist[aid].likes_count ?? 0))) {
                    artworksByArtist[aid] = art;
                  }
                }
              }
            } catch (artErr) {
              console.warn('Notice: Could not fetch artworks for top artists:', artErr);
            }
          }

          const merged = sorted.map((artist) => ({
            ...artist,
            artwork: artworksByArtist[artist.id] || null,
          }));

          if (isMounted) setArtists(merged);
        } else {
          const res = await fetch('/api/admin/artists/order?home=true');
          const json = await res.json();
          if (json?.artists && isMounted) {
            const validArtists = json.artists.filter((p: any) => {
              const role = (p.role || '').toLowerCase();
              return role !== 'client' && role !== 'admin';
            });

            const artistIds = validArtists.map((a: any) => a.id).filter(Boolean);
            const artworksByArtist: Record<string, any> = {};

            if (artistIds.length > 0) {
              try {
                const { data: arts } = await supabase
                  .from('artworks')
                  .select('id, artist_id, user_id, title, gig_title, badge_title, base_rating, review_count_text, image_url, price, amount, likes_count, rating_score')
                  .in('artist_id', artistIds);

                if (arts && arts.length > 0) {
                  for (const art of arts) {
                    const aid = art.artist_id || art.user_id;
                    if (aid && (!artworksByArtist[aid] || (art.likes_count ?? 0) > (artworksByArtist[aid].likes_count ?? 0))) {
                      artworksByArtist[aid] = art;
                    }
                  }
                }
              } catch {}
            }

            const merged = validArtists.map((artist: any) => ({
              ...artist,
              artwork: artworksByArtist[artist.id] || null,
            }));
            setArtists(merged);
          }
        }
      } catch (e) {
        console.error('Failed to load top artists for hero:', e);
      } finally {
        if (isMounted) setLoadingArtists(false);
      }
    }

    fetchTopArtists();

    // Realtime subscription to profiles to reflect name or profile changes immediately
    const supabase = createClient();
    const channel = supabase
      .channel('home_artists_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchTopArtists();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Fallback fetch for top artworks if tRPC returns empty
  useEffect(() => {
    if (!trpcLoading && (!trpcArtworks || trpcArtworks.length === 0)) {
      let isMounted = true;
      async function fetchTopArtworksFallback() {
        setLoadingFallback(true);
        try {
          const supabase = createClient();
          const { data: arts } = await supabase
            .from('artworks')
            .select('*')
            .order('likes_count', { ascending: false })
            .limit(8);

          if (arts && arts.length > 0 && isMounted) {
            const formatted = arts.map((art: any) => ({
              id: art.id,
              artist_id: art.artist_id || art.user_id,
              title: art.title || 'Untitled Artwork',
              description: art.description || null,
              category: art.category || null,
              medium: art.medium || null,
              technique: art.technique || null,
              tags: art.tags || [],
              image_url: art.image_url,
              created_at: art.created_at,
              likesCount: art.likes_count || 0,
              isLiked: false,
              ratingsCount: 0,
              averageRating: art.rating_score || 0,
              userRating: null,
              pricing_type: art.pricing_type || 'FIXED_PRICE',
              selling_mode: art.pricing_type || 'FIXED_PRICE',
              price: art.price ?? art.amount ?? null,
              amount: art.amount ?? art.price ?? null,
            }));
            setFallbackArtworks(formatted);
          }
        } catch (e) {
          console.error('Failed to fetch fallback artworks for hero:', e);
        } finally {
          if (isMounted) setLoadingFallback(false);
        }
      }

      fetchTopArtworksFallback();
      return () => {
        isMounted = false;
      };
    }
  }, [trpcArtworks, trpcLoading]);

  const displayArtworks = (
    trpcArtworks && trpcArtworks.length > 0
      ? trpcArtworks.slice(0, 8)
      : fallbackArtworks.slice(0, 8)
  ) as ArtworkItem[];

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    trackEvent('hero_search_submit', { query: searchQuery });
    startTransition(() => {
      router.push(`/gallery?search=${encodeURIComponent(searchQuery.trim())}`);
    });
  }, [searchQuery, router]);

  const scrollSlider = useCallback((direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 320;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  return (
    <section
      className="relative overflow-x-hidden bg-gradient-to-b from-background via-background/95 to-background pt-4 pb-16 sm:pt-6 sm:pb-20"
      suppressHydrationWarning
    >
      {/* Background atmospheric ambient gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-slate-50 dark:bg-[#09090e] transition-colors duration-500">
        <div
          className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-amber-400/15 dark:bg-amber-600/10 blur-[130px] mix-blend-multiply dark:mix-blend-screen"
        />
        <div
          className="absolute top-[15%] -right-[10%] w-[50%] h-[50%] rounded-full bg-yellow-300/15 dark:bg-amber-500/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen"
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* COMPACT AUTO-SWIPING CARD CAROUSEL WITH GET OFFER WHATSAPP CLAIM */}
        <HomeHeroSlider />

        {/* Compact Search Bar Row directly below full-width hero slider */}
        <div className="max-w-2xl mx-auto w-full">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-1.5 sm:p-2 shadow-md backdrop-blur">
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search artworks by title, medium, style, or artist…"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 py-2 pl-10 pr-3 text-sm text-foreground shadow-sm transition focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  aria-label="Search artworks"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="inline-flex items-center justify-center rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 px-6 py-2 text-sm font-semibold shadow-md shadow-amber-500/20 transition cursor-pointer"
              >
                Search
              </Button>
            </form>
          </div>
        </div>

        {/* FEATURED TOP ARTISTS SECTION (Horizontal Slider / Row) */}
        <div className="w-full text-left">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                Featured Creators
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Top Artists &amp; Creators
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Handpicked verified artists available for custom commissions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollSlider('left')}
                className="h-8 w-8 rounded-full border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollSlider('right')}
                className="h-8 w-8 rounded-full border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Link
                href="/artists"
                className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 inline-flex items-center gap-1 ml-2 transition-colors"
              >
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Slider Row */}
          <div
            ref={sliderRef}
            className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
          >
            {loadingArtists ? (
              [...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="min-w-[280px] sm:min-w-[320px] max-w-[340px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 animate-pulse overflow-hidden flex flex-col flex-shrink-0 snap-start"
                >
                  <div className="aspect-[16/10] w-full bg-slate-200 dark:bg-slate-800" />
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))
            ) : artists.length === 0 ? (
              <div className="w-full text-center py-8 text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                No featured artists selected for the home page yet. Enable artists in Admin Panel &rarr; Artist Showcase.
              </div>
            ) : (
              artists.map((artist, idx) => {
                const artistId = artist.id;
                const firstName = (artist.first_name || artist.firstName || '').trim();
                const lastName = (artist.last_name || artist.lastName || '').trim();
                const fullNameFromFirstLast = [firstName, lastName].filter(Boolean).join(' ').trim();
                const name =
                  fullNameFromFirstLast ||
                  artist.full_name ||
                  artist.display_name ||
                  artist.name ||
                  artist.username ||
                  artist.email?.split('@')[0] ||
                  'Featured Artist';
                const title =
                  artist.title ||
                  artist.professional_title ||
                  'Verified Creator';
                const avatar = getPublicUrl(artist.avatar_url, artistId);
                const isVerified = Boolean(artist.is_verified || artist.isVerified);
                const order = artist.display_order ?? 0;

                // Artwork and gig metadata
                const artwork = artist.artwork;
                const artworkImage = artwork?.image_url
                  ? getSafeArtworkUrl(artwork.image_url)
                  : CURATED_GIG_THUMBNAILS[idx % CURATED_GIG_THUMBNAILS.length];

                // Fiverr-style badge with diamonds (e.g. "Top Rated ◆◆◆" or "Level 2 ◆◆")
                const defaultBadge = idx === 0 ? 'Top Rated' : idx === 1 ? 'Level 2' : 'Top Rated';
                const badgeFormatted = formatBadgeWithDiamonds(artwork?.badge_title || artist.badge_title || defaultBadge);

                // Catchy Gig Title ("I will create...")
                const catchyTitle = formatGigTitle(
                  artwork?.title || title || 'custom digital artwork and creative illustrations',
                  artwork?.gig_title
                );

                // Star Rating metadata row (e.g. "★ 4.9 (1k+)")
                const cardRating = artwork?.base_rating ?? (artwork?.rating_score ? Number(artwork.rating_score) : 4.9);
                const ratingFormatted = typeof cardRating === 'number' ? cardRating.toFixed(1) : cardRating;
                const reviewCountFormatted = artwork?.review_count_text || (idx % 2 === 0 ? '(1k+)' : `(${45 + idx * 15})`);

                // Starting at price
                const rawPrice = Number(artwork?.price ?? artwork?.amount ?? (15000 + idx * 2500));
                const priceFormatted = rawPrice > 0 ? rawPrice.toLocaleString() : '15,000';

                const isLiked = Boolean(likedGigs[artistId]);

                return (
                  <div
                    key={artistId || idx}
                    className="group min-w-[280px] sm:min-w-[320px] max-w-[340px] flex-shrink-0 snap-start flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-amber-400/80 dark:hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl dark:hover:shadow-amber-500/10"
                  >
                    {/* Top Artwork Thumbnail with Wishlist Heart Overlay */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900/5 dark:bg-slate-950">
                      <Link href={`/freelancers/${artistId}`} className="block w-full h-full">
                        <img
                          src={artworkImage}
                          alt={catchyTitle}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = DEFAULT_ARTWORK_PLACEHOLDER;
                          }}
                        />
                      </Link>

                      {/* Wishlist Heart Icon Overlay on Top Right */}
                      <button
                        type="button"
                        onClick={(e) => toggleGigLike(e, artistId)}
                        aria-label={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
                        className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-md cursor-pointer"
                      >
                        <Heart
                          className={`h-4 w-4 transition-transform ${
                            isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white/90 hover:text-rose-400'
                          }`}
                        />
                      </button>

                      {/* Display order rank pill on top left if specified */}
                      {order < 999 && (
                        <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-amber-300 border border-amber-400/40 backdrop-blur-md shadow-sm">
                            #{order} Featured
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Fiverr Style Details Panel */}
                    <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
                      <div className="space-y-2.5">
                        {/* Creator Profile Row: ENLARGED AVATAR + Name + Badge Pill */}
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/freelancers/${artistId}`}
                            className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-amber-400/50 ring-2 ring-amber-400/20 shadow-md shrink-0 bg-slate-100 dark:bg-slate-800 group-hover:scale-105 transition-transform"
                          >
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-lg sm:text-xl">
                                {name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </Link>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                href={`/freelancers/${artistId}`}
                                className="font-bold text-sm text-slate-900 dark:text-white truncate hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                              >
                                {name}
                              </Link>

                              {/* Badge pill right next to name (e.g. "Top Rated ◆◆◆") */}
                              <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0">
                                {badgeFormatted}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                              {isVerified && <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />}
                              <span>{title}</span>
                            </p>
                          </div>
                        </div>

                        {/* Catchy Gig Title Text below ("I will create...") */}
                        <Link
                          href={`/freelancers/${artistId}`}
                          className="block font-medium text-slate-900 dark:text-slate-100 text-sm hover:text-amber-600 dark:hover:text-amber-400 line-clamp-2 transition-colors leading-snug"
                          title={catchyTitle}
                        >
                          {catchyTitle}
                        </Link>

                        {/* Star Rating row with bold rating number and review count (e.g. "★ 4.9 (1k+)") */}
                        <div className="flex items-center gap-1.5 text-xs text-amber-500 pt-0.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            {ratingFormatted}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {reviewCountFormatted}
                          </span>
                        </div>
                      </div>

                      {/* Footer Row: Starting at Price & View Gig CTA */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
                            Starting at
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            LKR {priceFormatted}
                          </span>
                        </div>

                        <Link
                          href={`/freelancers/${artistId}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-700 dark:text-amber-400 hover:text-slate-950 font-semibold text-xs transition-all duration-200"
                        >
                          View Gig <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* TOP-RATED & MOST LIKED ARTWORKS SECTION */}
        <div className="w-full text-left">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Curated Masterpieces
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Top-Rated &amp; Most Liked Artworks
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Explore community favorites and highly praised creations from our verified gallery.
              </p>
            </div>
            <div>
              <Link
                href="/gallery"
                className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 inline-flex items-center gap-1 transition-colors"
              >
                Explore Full Gallery <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {trpcLoading && displayArtworks.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-[340px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <GalleryGrid
              artworks={displayArtworks}
              emptyMessage="No featured artworks found at this time."
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default HomeHero;
