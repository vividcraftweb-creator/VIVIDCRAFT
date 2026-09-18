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

export function HomeHero() {
  const router = useRouter();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Horizontal artist slider ref
  const sliderRef = useRef<HTMLDivElement>(null);

  // Top Manual-Ordered Artists state
  const [artists, setArtists] = useState<any[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(true);

  // Top-Rated / Most Liked Artworks state
  const { data: trpcArtworks, isLoading: trpcLoading } = trpc.artworks.getAllArtworks.useQuery(
    { sort: 'popular', mode: 'ALL' },
    { refetchOnWindowFocus: false }
  );
  const [fallbackArtworks, setFallbackArtworks] = useState<any[]>([]);
  const [loadingFallback, setLoadingFallback] = useState(false);

  // Fetch top artists (ONLY artists where show_on_home = true, strictly sorted by display_order ASC)
  useEffect(() => {
    let isMounted = true;
    async function fetchTopArtists() {
      setLoadingArtists(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('show_on_home', true)
          .order('display_order', { ascending: true });

        if (!error && Array.isArray(data)) {
          const sorted = [...data].sort(
            (a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0)
          );
          if (isMounted) setArtists(sorted);
        } else {
          const res = await fetch('/api/admin/artists/order?home=true');
          const json = await res.json();
          if (json?.artists && isMounted) {
            setArtists(json.artists);
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
                  className="min-w-[260px] sm:min-w-[280px] h-[230px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 animate-pulse p-5 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-20 w-20 rounded-full bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-full" />
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

                return (
                  <Link
                    key={artistId || idx}
                    href={`/freelancers/${artistId}`}
                    className="group min-w-[260px] sm:min-w-[280px] max-w-[300px] flex-shrink-0 snap-start block"
                  >
                    <div className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 dark:hover:border-amber-500/50 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-amber-400/40 ring-4 ring-amber-400/10 flex-shrink-0 bg-slate-100 dark:bg-slate-800 group-hover:scale-105 transition-transform">
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
                              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-2xl">
                                {name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {order < 999 && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                              #{order}
                            </span>
                          )}
                        </div>

                        <div className="mt-3">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {title}
                          </p>
                        </div>

                        {isVerified && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle className="h-3 w-3" />
                            Verified Artist
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end text-xs">
                        <span className="text-amber-600 dark:text-amber-400 font-semibold group-hover:underline inline-flex items-center gap-1">
                          View Profile <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
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
