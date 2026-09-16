'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Sparkles,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { trackEvent } from '@/utils/analytics';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trpc } from '@/utils/trpc';
import { getPublicUrl } from '@/components/artists/ArtistCard';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import type { ArtworkItem } from '@/components/gallery/ArtworkCard';

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // Horizontal slider ref
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

  // 1. Fetch Top Manual-Ordered Artists
  useEffect(() => {
    let isMounted = true;
    async function fetchTopArtists() {
      setLoadingArtists(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or('role.ilike.%artist%,role.ilike.%freelancer%')
          .order('display_order', { ascending: true })
          .limit(12);

        if (!error && data && data.length > 0) {
          const sorted = [...data].sort(
            (a, b) => Number(a.display_order ?? 999) - Number(b.display_order ?? 999)
          );
          if (isMounted) setArtists(sorted);
        } else {
          // Fallback to internal API
          const res = await fetch('/api/admin/artists/order');
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
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fallback fetch for top artworks if tRPC returns empty
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

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    trackEvent('hero_search_submit', { query: searchQuery });
    router.push(`/gallery?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 320;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background/90 to-background pt-28 pb-20 sm:pt-36 sm:pb-28"
      suppressHydrationWarning
    >
      {/* Vibrant fluid gradient mesh (adapts to light/dark) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-slate-50 dark:bg-[#09090e] transition-colors duration-500">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-amber-400/20 dark:bg-amber-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse duration-1000" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[10%] -right-[10%] w-[50%] h-[60%] rounded-full bg-yellow-300/20 dark:bg-amber-500/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-orange-300/15 dark:bg-yellow-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      {/* Canvas noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 space-y-14 sm:space-y-20">
        {/* Top Hero Section: Single Minimal Heading + Search Bar */}
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm">
            <span className="text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-300 sm:text-base">
              ✨ The Art Marketplace
            </span>
          </div>

          <h1 className="mt-4 sm:mt-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-none">
            Discover &amp; Collect Extraordinary Art
          </h1>

          {/* Search Bar directly below Heading */}
          <div className="mt-8 sm:mt-10 w-full">
            <div className="mx-auto w-full max-w-2xl rounded-full border border-slate-300 dark:border-white/30 bg-white/90 dark:bg-white/15 backdrop-blur-xl shadow-xl dark:shadow-2xl px-4 py-3 sm:px-6 sm:py-3.5 focus-within:ring-2 focus-within:ring-amber-500/50 transition-all">
              <div className="flex w-full items-center gap-4 sm:gap-5">
                <Search className="h-5 w-5 shrink-0 text-slate-400 dark:text-white/60 sm:h-5 sm:w-5" />
                <Input
                  placeholder="Search by medium, style, or artist…"
                  className="flex-1 border-none bg-transparent px-2 text-left text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-white/60 focus-visible:ring-0 sm:text-base font-medium"
                  aria-label="Search by medium, style, or artist"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  onClick={handleSearch}
                  size="sm"
                  className="shrink-0 rounded-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-white/90 px-5 py-2 sm:px-6 transition-colors font-medium shadow-sm"
                >
                  Search
                </Button>
              </div>
            </div>
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
                Handpicked and ordered verified artists available for commissions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollSlider('left')}
                className="h-8 w-8 rounded-full border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollSlider('right')}
                className="h-8 w-8 rounded-full border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
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
                  className="min-w-[260px] sm:min-w-[280px] h-[210px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 animate-pulse p-5 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-slate-200 dark:bg-slate-800" />
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
                No artists available at the moment.
              </div>
            ) : (
              artists.map((artist, idx) => {
                const artistId = artist.id;
                const name =
                  artist.full_name ||
                  artist.name ||
                  artist.email?.split('@')[0] ||
                  'Featured Artist';
                const title =
                  artist.title ||
                  artist.professional_title ||
                  'Verified Creator';
                const avatar = getPublicUrl(artist.avatar_url, artistId);
                const isVerified = Boolean(artist.is_verified || artist.isVerified);
                const order = artist.display_order ?? 999;

                return (
                  <Link
                    key={artistId || idx}
                    href={`/freelancers/${artistId}`}
                    className="group min-w-[260px] sm:min-w-[280px] max-w-[300px] flex-shrink-0 snap-start block"
                  >
                    <div className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 dark:hover:border-amber-500/50 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-amber-400/40 ring-4 ring-amber-400/10 flex-shrink-0 bg-slate-100 dark:bg-slate-800 group-hover:scale-105 transition-transform">
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
                              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-lg">
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

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          Commissions Open
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold group-hover:underline inline-flex items-center gap-0.5">
                          Profile <ArrowRight className="h-3 w-3" />
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
};

export default Hero;
