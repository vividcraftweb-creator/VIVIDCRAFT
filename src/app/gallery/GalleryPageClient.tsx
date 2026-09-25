'use client';

import React, { useState, useEffect, useMemo, useCallback, startTransition } from 'react';
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
  Trash2,
  UploadCloud,
  Tag,
  Gavel,
  Filter,
  Palette,
  ArrowRight,
  ChevronUp,
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
import { getArtworkPricingDisplay, extractArtistName } from '@/lib/artworks';

import dynamic from 'next/dynamic';
import type { RankedArtwork, ArtworkArtist } from '@/types/artwork';

const GalleryArtworkDetailsModal = dynamic(
  () => import('@/components/gallery/GalleryArtworkDetailsModal'),
  { ssr: false }
);
const GalleryDeleteModal = dynamic(
  () => import('@/components/gallery/GalleryDeleteModal'),
  { ssr: false }
);
const GalleryUploadModal = dynamic(
  () => import('@/components/gallery/GalleryUploadModal'),
  { ssr: false }
);

type SortOption = 'popular' | 'highest_rated' | 'most_liked' | 'newest';
type CategoryFilter = 'ALL' | 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE';

export default function GalleryPageClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeSort, setActiveSort] = useState<SortOption>('popular');
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('ALL');
  const [selectedMedium, setSelectedMedium] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState<RankedArtwork | null>(null);
  const [hoveredRating, setHoveredRating] = useState<{ [key: string]: number }>({});
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Local state for instant optimistic updates
  const [localArtworks, setLocalArtworks] = useState<RankedArtwork[]>([]);

  // Deletion Modal state (Admin In-Situ Moderation)
  const [deletingArtwork, setDeletingArtwork] = useState<RankedArtwork | null>(null);

  // Admin Upload Modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Fetch current user and check admin status
  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        // Check mock admin in localStorage
        if (typeof window !== 'undefined') {
          const localUserStr = localStorage.getItem('user');
          if (localUserStr) {
            try {
              const parsed = JSON.parse(localUserStr);
              const parsedEmail = (parsed?.email || '').toLowerCase().trim();
              if (parsed?.role === 'admin' || parsedEmail === 'vividcraftweb@gmail.com' || parsedEmail === 'cinnamongallerysocial@gmail.com') {
                setIsAdmin(true);
                setCurrentUserId('admin-vividcraft-default-id');
              }
            } catch {}
          }
        }
        return;
      }

      setCurrentUserId(user.id);
      const userEmail = (user.email || '').toLowerCase().trim();
      const metaRole = (user.user_metadata?.role || '').toString().toUpperCase();
      if (metaRole === 'ADMIN' || userEmail === 'vividcraftweb@gmail.com' || userEmail === 'cinnamongallerysocial@gmail.com') {
        setIsAdmin(true);
        return;
      }

      // Check profiles table for admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.role?.toString().toUpperCase() === 'ADMIN') {
        setIsAdmin(true);
      }
    }).catch(() => {
      setCurrentUserId(null);
    });

    // Handle ?upload=true query parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('upload') === 'true') {
        setIsUploadOpen(true);
      }
    }
  }, []);


  // Listen for instant artwork deletion events across the entire app
  useEffect(() => {
    const handleArtworkDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      const deletedId = customEvent.detail?.id;
      if (deletedId) {
        setLocalArtworks((prev) => prev.filter((a) => a.id !== deletedId));
        setSelectedArtwork((prev) => (prev && prev.id === deletedId ? null : prev));
      }
    };

    window.addEventListener('artwork-deleted', handleArtworkDeleted);
    return () => {
      window.removeEventListener('artwork-deleted', handleArtworkDeleted);
    };
  }, []);

  // Fetch via tRPC procedure
  const { data: remoteArtworks, isLoading, refetch } = trpc.artworks.getAllArtworks.useQuery(
    { sort: activeSort, search: searchQuery, mode: 'ALL' },
    {
      refetchOnWindowFocus: false,
    }
  );

  const utils = trpc.useUtils();

  const toggleLikeMutation = trpc.artworks.toggleLike.useMutation({
    onError: (err) => {
      toast.error('Failed to update like: ' + err.message);
      refetch();
    },
    onSuccess: () => {
      utils.artworks.getAllArtworks.invalidate();
    },
  });

  const handleToggleLike = useCallback((artwork: RankedArtwork, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!currentUserId) {
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

    const nextLiked = !artwork.isLiked;
    setLocalArtworks((prev) =>
      prev.map((a) =>
        a.id === artwork.id
          ? {
              ...a,
              isLiked: nextLiked,
              likesCount: nextLiked ? a.likesCount + 1 : Math.max(0, a.likesCount - 1),
            }
          : a
      )
    );

    toggleLikeMutation.mutate({ artworkId: artwork.id });
  }, [currentUserId, router, toggleLikeMutation]);

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
          let arts: any[] | null = null;
          try {
            const res = await supabase
              .from('artworks')
              .select(`
                *,
                profiles:artist_id (
                  id,
                  first_name,
                  last_name,
                  full_name,
                  avatar_url
                )
              `)
              .order('created_at', { ascending: false });
            if (!res.error && res.data && res.data.length > 0) {
              arts = res.data;
            }
          } catch {}

          if (!arts || arts.length === 0) {
            try {
              const res = await supabase
                .from('artworks')
                .select(`
                  *,
                  profiles:user_id (
                    id,
                    first_name,
                    last_name,
                    full_name,
                    avatar_url
                  )
                `)
                .order('created_at', { ascending: false });
              if (!res.error && res.data && res.data.length > 0) {
                arts = res.data;
              }
            } catch {}
          }

          if (!arts || arts.length === 0) {
            const { data } = await supabase
              .from('artworks')
              .select('*')
              .order('created_at', { ascending: false });
            arts = data || [];
          }

          if (arts && arts.length > 0) {
            const artIds = arts.map((a: any) => a.id);
            const artistIds = Array.from(new Set(arts.map((a: any) => a.artist_id || a.user_id).filter(Boolean)));

            const [likesRes, ratingsRes, profilesRes] = await Promise.all([
              supabase.from('artwork_likes').select('artwork_id, user_id').in('artwork_id', artIds),
              supabase.from('artwork_ratings').select('artwork_id, user_id, rating').in('artwork_id', artIds),
              artistIds.length > 0
                ? supabase.from('profiles').select('id, first_name, last_name, full_name, avatar_url, role, email, whatsapp_number, artist_name, title, professional_title').in('id', artistIds)
                : Promise.resolve({ data: [] }),
            ]);

            const likes = likesRes.data || [];
            const ratings = ratingsRes.data || [];
            const profiles = profilesRes.data || [];
            const pMap = new Map<string, any>();
            profiles.forEach((p: any) => pMap.set(p.id, p));

            const mapped: RankedArtwork[] = arts.map((art: any, index: number) => {
              const artLikes = likes.filter((l: any) => l.artwork_id === art.id);
              const artRatings = ratings.filter((r: any) => r.artwork_id === art.id);
              const isLiked = currentUserId ? artLikes.some((l: any) => l.user_id === currentUserId) : false;
              const userRatingRow = currentUserId ? artRatings.find((r: any) => r.user_id === currentUserId) : null;

              const ratingsSum = artRatings.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
              const avg = artRatings.length > 0 ? Math.round((ratingsSum / artRatings.length) * 10) / 10 : 0;
              const prof = pMap.get(art.artist_id) || pMap.get(art.user_id) || art.profiles;
              const fName = (prof?.first_name || art.profiles?.first_name || '').toString().trim();
              const lName = (prof?.last_name || art.profiles?.last_name || '').toString().trim();
              const profileFullName = (prof?.full_name || art.profiles?.full_name || '').toString().trim();
              const combinedFirstLast = [fName, lName].filter(Boolean).join(' ').trim();
              const artistNameField = (prof?.artist_name || art.profiles?.artist_name || '').trim();
              const emailPrefix = prof?.email ? prof.email.split('@')[0] : '';
              const artistName = combinedFirstLast || profileFullName || emailPrefix || artistNameField || 'Artist';


              const rawArtCode = art.art_code;
              let artCode = '';
              if (rawArtCode && typeof rawArtCode === 'string') {
                artCode = rawArtCode.startsWith('#') ? rawArtCode : `#${rawArtCode}`;
              } else {
                const hash = Math.abs(art.id.split('').reduce((acc: number, c: string) => (acc * 31 + c.charCodeAt(0)) | 0, 0)) % 900 + 100;
                artCode = `#ART-${hash}`;
              }

              const { badgeType } = getArtworkPricingDisplay(art);
              const sellingMode =
                badgeType === 'FOR_SALE'
                  ? 'FIXED_PRICE'
                  : badgeType === 'BIDDING'
                  ? 'BIDDING'
                  : 'NOT_FOR_SALE';

              return {
                id: art.id,
                artist_id: art.artist_id,
                title: art.title || 'Untitled Artwork',
                description: art.description || null,
                category: art.category || null,
                medium: art.medium || null,
                technique: art.technique || null,
                tags: Array.isArray(art.tags)
                  ? art.tags
                  : typeof art.tags === 'string'
                  ? art.tags.replace(/[\{\}\"\[\]]/g, '').split(',').map((t: string) => t.trim()).filter(Boolean)
                  : [],
                image_url: art.image_url,
                created_at: art.created_at,
                likesCount: artLikes.length,
                ratingsCount: artRatings.length,
                averageRating: avg,
                userRating: userRatingRow ? Number(userRatingRow.rating) : null,
                isLiked,
                popularityScore: artLikes.length * 3 + avg * Math.log2(artRatings.length + 2) * 4,
                selling_mode: sellingMode,
                pricing_type: sellingMode,
                price: art.price !== undefined && art.price !== null ? Number(art.price) : null,
                starting_bid: art.starting_bid !== undefined && art.starting_bid !== null ? Number(art.starting_bid) : null,
                art_code: artCode,
                profiles: prof ? {
                  id: prof.id,
                  first_name: prof.first_name || null,
                  last_name: prof.last_name || null,
                  full_name: profileFullName || null,
                  artist_name: artistNameField || null,
                  avatar_url: prof?.avatar_url || null,
                  role: prof?.role || 'artist',
                } : (art.profiles ? {
                  id: art.profiles.id,
                  first_name: art.profiles.first_name || null,
                  last_name: art.profiles.last_name || null,
                  full_name: art.profiles.full_name || null,
                  avatar_url: art.profiles.avatar_url || null,
                } : null),
                user_name: art.user_name || artistName,
                artist: {
                  id: art.artist_id || art.user_id,
                  name: artistName,
                  first_name: prof?.first_name || art.profiles?.first_name || null,
                  last_name: prof?.last_name || art.profiles?.last_name || null,
                  avatar_url: prof?.avatar_url || art.profiles?.avatar_url || null,
                  title: prof?.title || 'Verified Artist',
                  role: prof?.role || 'artist',
                  bio: prof?.bio || null,
                  location: prof?.location || null,
                  phone: prof?.phone || null,
                  whatsapp_number: prof?.whatsapp_number || prof?.phone || null,
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

  // Dynamic medium list combining loaded artwork mediums + standard mediums
  const availableMediums = useMemo(() => {
    const set = new Set<string>();
    localArtworks.forEach((art) => {
      if (art.medium && typeof art.medium === 'string') {
        art.medium.split(',').forEach((m) => {
          const trimmed = m.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });

    const standard = [
      'Oil Painting',
      'Acrylic Painting',
      'Watercolor',
      'Digital Art',
      'Sketch / Charcoal',
      'Mixed Media',
      'Sculpture',
    ];
    standard.forEach((s) => set.add(s));
    return Array.from(set);
  }, [localArtworks]);

  // Client-side filtering and sorting for instant responsiveness
  const displayedArtworks = useMemo(() => {
    // When viewing ALL or specific category, include Bidding items only if explicitly requested
    let list = localArtworks.filter((art) => {
      const { badgeType } = getArtworkPricingDisplay(art);
      const effectiveFilterType =
        badgeType === 'FOR_SALE'
          ? 'FIXED_PRICE'
          : badgeType === 'BIDDING'
          ? 'BIDDING'
          : 'NOT_FOR_SALE';

      if (activeFilter === 'ALL') {
        // Show everything except BIDDING artworks on main gallery page
        return effectiveFilterType !== 'BIDDING';
      }
      // Specific category filter — show items matching the selected tab
      return effectiveFilterType === activeFilter;
    });

    // Medium sidebar / pill filter
    if (selectedMedium !== 'ALL') {
      const targetMed = selectedMedium.toLowerCase().trim();
      list = list.filter((art) => {
        if (!art.medium) return false;
        return String(art.medium).toLowerCase().includes(targetMed);
      });
    }

    // Unified multi-category search: title, description, category, medium, technique, tags, artist name, art code
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase().trim();
      list = list.filter((art) =>
        [
          art.title,
          art.description,
          art.category,
          art.medium,
          art.technique,
          art.artist?.name,
          art.art_code,
          ...(Array.isArray(art.tags) ? art.tags : []),
        ].some((field) => field && String(field).toLowerCase().includes(searchLower))
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
  }, [localArtworks, searchQuery, activeSort, activeFilter, selectedMedium]);


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
              newSum = newSum - previousRating + rating;
            } else {
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

  const handleArtworkDeletedCallback = useCallback((deletedId: string) => {
    setLocalArtworks((prev) => prev.filter((a) => a.id !== deletedId));
    setSelectedArtwork((prev) => (prev && prev.id === deletedId ? null : prev));
    setDeletingArtwork(null);
  }, []);
  const handleArtworkUploaded = useCallback((newArtwork: RankedArtwork) => {
    setLocalArtworks((prev) => [newArtwork, ...prev]);
  }, []);


  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 pt-6 pb-20 sm:pt-6 sm:pb-20 relative overflow-hidden transition-colors duration-300">
      {/* Background aesthetic gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-amber-500/10 via-yellow-500/5 to-transparent dark:from-amber-600/15 dark:via-yellow-600/10 dark:to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-amber-500/5 dark:bg-amber-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-48 w-96 h-96 bg-yellow-500/5 dark:bg-yellow-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Admin Floating Banner (Active Session Indicator) */}
      {isAdmin && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-amber-500/10 dark:bg-gradient-to-r dark:from-amber-500/15 dark:via-amber-500/10 dark:to-amber-500/10 border border-amber-500/30 rounded-2xl backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Admin Moderation Active</span>
                <span className="text-xs text-amber-800 dark:text-amber-300/80 ml-2 hidden sm:inline">
                  You have full moderation rights to delete posts with reason and upload direct artwork.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => startTransition(() => setIsUploadOpen(true))}
                className="bg-[#A2694E] hover:bg-[#8B5A3C] text-white font-bold text-xs h-8 px-3 gap-1.5 shadow-md shadow-[#A2694E]/20 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-white" />
                <span>Upload Artwork</span>
              </Button>
              <Link href="/admin">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 text-xs h-8 px-3 cursor-pointer"
                >
                  Admin Console
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Hero Section */}
        <div className="text-center max-w-xl mx-auto mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Cinnamon Gallery
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Curated <span className="text-amber-600 dark:text-amber-400">Artworks &amp; Portfolios</span>
          </h1>

          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal">
            Discover ranked original creations, rate pieces, and commission top artists.
          </p>

          {/* Compact Search Bar & Admin Quick Upload */}
          <div className="mx-auto mt-4 max-w-xl">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-1.5 sm:p-2 shadow-md backdrop-blur flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search artworks by title or artist…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 py-2 pl-10 pr-14 text-sm text-foreground shadow-sm transition focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => startTransition(() => setSearchQuery(''))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-[11px] bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {isAdmin && (
                <Button
                  onClick={() => startTransition(() => setIsUploadOpen(true))}
                  className="inline-flex items-center justify-center rounded-xl bg-[#A2694E] hover:bg-[#8B5A3C] text-white font-semibold px-4 py-2 text-sm shadow-md shadow-[#A2694E]/20 transition flex-shrink-0 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 mr-1.5 text-white" />
                  <span>Upload</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Filter Tabs / Sort Controls */}
        <div className="flex flex-col gap-3 mb-6 pb-3 border-b border-slate-200 dark:border-slate-800/80">
          {/* Row 1 — Sort Tabs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 p-1 bg-slate-200/70 dark:bg-slate-900/90 border border-slate-300/70 dark:border-slate-800 rounded-2xl overflow-x-auto max-w-full">
              <button
                onClick={() => startTransition(() => setActiveSort('popular'))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeSort === 'popular'
                    ? 'bg-[#A2694E] text-white shadow-md shadow-[#A2694E]/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/60'
                }`}
              >
                <Flame className="w-4 h-4 text-orange-600 dark:text-orange-500" />
                <span>Most Popular</span>
              </button>

              <button
                onClick={() => startTransition(() => setActiveSort('highest_rated'))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeSort === 'highest_rated'
                    ? 'bg-[#A2694E] text-white shadow-md shadow-[#A2694E]/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/60'
                }`}
              >
                <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-500 fill-current" />
                <span>Highest Rated</span>
              </button>

              <button
                onClick={() => startTransition(() => setActiveSort('most_liked'))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeSort === 'most_liked'
                    ? 'bg-[#A2694E] text-white shadow-md shadow-[#A2694E]/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/60'
                }`}
              >
                <Heart className="w-4 h-4 text-rose-500 dark:text-rose-400 fill-rose-500 dark:fill-rose-400" />
                <span>Most Liked</span>
              </button>

              <button
                onClick={() => startTransition(() => setActiveSort('newest'))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeSort === 'newest'
                    ? 'bg-[#A2694E] text-white shadow-md shadow-[#A2694E]/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/60'
                }`}
              >
                <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span>Newest</span>
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Showing <span className="text-slate-900 dark:text-white font-semibold">{displayedArtworks.length}</span> artworks
            </div>
          </div>

          {/* Row 2 — Category Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </div>

            <button
              onClick={() => startTransition(() => setActiveFilter('ALL'))}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                activeFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>All Artworks</span>
            </button>

            <button
              onClick={() => startTransition(() => setActiveFilter('FIXED_PRICE'))}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                activeFilter === 'FIXED_PRICE'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                  : 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-400 dark:hover:border-emerald-600'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>For Sale</span>
            </button>

            <button
              onClick={() => startTransition(() => setActiveFilter('BIDDING'))}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                activeFilter === 'BIDDING'
                  ? 'bg-[#A2694E] text-white border-[#A2694E] shadow-md shadow-[#A2694E]/20'
                  : 'text-[#A2694E] dark:text-[#C58B6F] border-[#A2694E]/30 dark:border-[#A2694E]/40 hover:bg-[#A2694E]/10 dark:hover:bg-[#A2694E]/20 hover:border-[#A2694E]'
              }`}
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>Open Bidding</span>
            </button>

            <button
              onClick={() => startTransition(() => setActiveFilter('NOT_FOR_SALE'))}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                activeFilter === 'NOT_FOR_SALE'
                  ? 'bg-slate-500 text-white border-slate-500 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              <span>Not For Sale</span>
            </button>
          </div>

          {/* Row 3 — Medium Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs no-scrollbar pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 shrink-0">
              <Palette className="w-3.5 h-3.5 text-[#A2694E]" />
              <span>Medium:</span>
            </div>

            <button
              onClick={() => startTransition(() => setSelectedMedium('ALL'))}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer shrink-0 border ${
                selectedMedium === 'ALL'
                  ? 'bg-[#A2694E] text-white font-bold border-[#A2694E] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Mediums
            </button>

            {availableMediums.map((med) => {
              const isActive = selectedMedium.toLowerCase() === med.toLowerCase();
              return (
                <button
                  key={med}
                  onClick={() => startTransition(() => setSelectedMedium(isActive ? 'ALL' : med))}
                  className={`px-3 py-1 rounded-full text-xs transition-all duration-200 cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-[#A2694E] text-white font-bold border-[#A2694E] shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-[#A2694E]/60 dark:hover:border-[#A2694E]/50 hover:bg-[#A2694E]/10'
                  }`}
                >
                  {med}
                </button>
              );
            })}

            {selectedMedium !== 'ALL' && (
              <button
                onClick={() => startTransition(() => setSelectedMedium('ALL'))}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline shrink-0 ml-1 px-1 cursor-pointer font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>


        {/* Gallery Grid */}
        {isLoading && localArtworks.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl overflow-hidden animate-pulse shadow-sm"
              >
                <div className="h-32 sm:h-48 bg-slate-100 dark:bg-slate-800/60" />
                <div className="p-2 sm:p-3 space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedArtworks.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 border-dashed rounded-3xl max-w-2xl mx-auto p-8 space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Artworks Found</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {searchQuery
                ? `No artworks matched your search query "${searchQuery}". Try a different keyword.`
                : activeFilter === 'FIXED_PRICE'
                ? 'No artworks are currently listed for sale. Check back later or explore all artworks.'
                : activeFilter === 'BIDDING'
                ? 'No artworks are currently open for bidding. Explore the full gallery or check the Bidding page.'
                : activeFilter === 'NOT_FOR_SALE'
                ? 'No portfolio-only artworks found in this view.'
                : 'No artworks have been uploaded yet. Artists or admins can upload pieces to start the gallery.'}
            </p>
            {isAdmin && (
              <Button
                onClick={() => setIsUploadOpen(true)}
                className="bg-[#A2694E] hover:bg-[#8B5A3C] text-white font-bold gap-2 cursor-pointer shadow-md shadow-[#A2694E]/20"
              >
                <UploadCloud className="w-4 h-4 text-white" />
                <span>Upload First Artwork</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {displayedArtworks.map((artwork) => {
              const safeImg = getSafeArtworkUrl(artwork.image_url);
              const dynamicArtistName = extractArtistName(artwork);
              const artistAvatar = getProfilePictureUrl(artwork.artist_id, artwork.profiles?.avatar_url || artwork.artist?.avatar_url);
              const initials = (dynamicArtistName || 'Artist')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              const artworkTitle = (artwork.title || 'Untitled Artwork').trim();
              const { statusBadge, displayPrice, badgeType } = getArtworkPricingDisplay(artwork);

              const isCardExpanded = Boolean(expandedCardIds[artwork.id]);

              return (
                <div
                  key={artwork.id}
                  className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-amber-400/80 dark:hover:border-amber-500/50 rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md dark:hover:shadow-amber-500/10 flex flex-col hover:-translate-y-0.5 self-start w-full"
                >
                  {/* Artwork Image Container with Tight Compact Height & Crisp Image Framing */}
                  <div
                    onClick={() => setSelectedArtwork(artwork)}
                    className="relative w-full h-32 sm:h-48 overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer select-none rounded-t-lg"
                  >
                    {/* Crisp Foreground Artwork Image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={safeImg}
                      alt={artworkTitle}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = DEFAULT_ARTWORK_PLACEHOLDER;
                      }}
                    />

                    {/* Top-Left Pricing Status Badge & Admin Delete Button */}
                    <div className="absolute top-1.5 left-1.5 z-30 flex items-center gap-1 pointer-events-auto">
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingArtwork(artwork);
                          }}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-600/90 hover:bg-rose-600 text-white text-[9px] font-bold shadow-md backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-pointer"
                          title="Admin Moderation: Delete Post with Reason"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Delete</span>
                        </button>
                      )}

                      {badgeType === 'FOR_SALE' && (
                        <span className="text-[9px] font-bold text-amber-950 dark:text-amber-300 bg-amber-400/95 dark:bg-amber-500/30 border border-amber-500/40 px-1.5 py-0.5 rounded shadow-sm backdrop-blur-md">
                          {statusBadge}
                        </span>
                      )}
                      {badgeType === 'BIDDING' && (
                        <span className="text-[9px] font-bold text-white bg-orange-500/95 dark:bg-orange-500/35 dark:text-orange-300 border border-orange-500/50 px-1.5 py-0.5 rounded shadow-sm backdrop-blur-md">
                          {statusBadge}
                        </span>
                      )}
                      {badgeType === 'NOT_FOR_SALE' && (
                        <span className="text-[9px] font-medium text-slate-700 dark:text-slate-300 bg-white/95 dark:bg-slate-800/95 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded shadow-sm backdrop-blur-md">
                          {statusBadge}
                        </span>
                      )}
                    </div>

                    {/* Bottom-Right hover action: Maximize button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedArtwork(artwork);
                      }}
                      className="absolute bottom-1.5 right-1.5 z-30 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:bg-[#A2694E] hover:text-white hover:border-[#A2694E] cursor-pointer shadow-lg"
                      title="View full screen"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Compact Default Bar: Likes counter on left, See More expand toggle on right */}
                  <div className="p-1.5 sm:p-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1 sm:gap-2">
                    {/* Interactive Like Action & Real Likes Count */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleLike(artwork, e)}
                      className={`inline-flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer group/like select-none ${
                        artwork.isLiked
                          ? 'text-rose-600 dark:text-rose-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                      }`}
                      title={artwork.isLiked ? 'Unlike this artwork' : 'Like this artwork'}
                      aria-label={`${artwork.likesCount} likes`}
                    >
                      <Heart
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover/like:scale-110 active:scale-125 ${
                          artwork.isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-400 dark:text-slate-500 group-hover/like:text-rose-500'
                        }`}
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-[10px] sm:text-xs">
                        {artwork.likesCount}
                      </span>
                    </button>

                    {/* See More Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedCardIds((prev) => ({
                          ...prev,
                          [artwork.id]: !prev[artwork.id],
                        }));
                      }}
                      className="inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-semibold text-[#A2694E] dark:text-[#C58B6F] hover:text-[#8B5A3C] dark:hover:text-[#DDA78D] transition-colors py-0.5 px-1 sm:px-1.5 rounded hover:bg-[#A2694E]/10 cursor-pointer"
                      aria-label={isCardExpanded ? 'See Less' : 'See More'}
                      title={isCardExpanded ? 'Collapse details' : 'Expand details'}
                    >
                      <span>{isCardExpanded ? 'Less' : 'See More'}</span>
                      {isCardExpanded ? (
                        <ChevronUp className="w-3 h-3 transition-transform" />
                      ) : (
                        <ArrowRight className="w-3 h-3 transition-transform" />
                      )}
                    </button>
                  </div>

                  {/* Expandable Revealed Details Section */}
                  {isCardExpanded && (
                    <div className="bg-slate-50/70 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800/80 p-2 sm:p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Artist Row: Avatar + Name */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Link
                          href={`/freelancers/${artwork.artist_id}`}
                          className="flex-shrink-0 group/avatar"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Avatar className="w-5 h-5 sm:w-6 sm:h-6 ring-1 ring-amber-500/30 group-hover/avatar:ring-amber-400 transition-all">
                            {artistAvatar && <AvatarImage src={artistAvatar} alt={dynamicArtistName} />}
                            <AvatarFallback className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 text-[9px] font-semibold">
                              {initials || <User className="w-2.5 h-2.5" />}
                            </AvatarFallback>
                          </Avatar>
                        </Link>

                        <Link
                          href={`/freelancers/${artwork.artist_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 truncate block transition-colors"
                        >
                          {dynamicArtistName}
                        </Link>
                      </div>

                      {/* Dynamic Artwork Title */}
                      <h3
                        onClick={() => setSelectedArtwork(artwork)}
                        className="font-semibold text-slate-900 dark:text-slate-100 text-[11px] sm:text-xs hover:text-amber-600 dark:hover:text-amber-400 line-clamp-1 cursor-pointer transition-colors leading-snug"
                        title={artworkTitle}
                      >
                        {artworkTitle}
                      </h3>

                      {/* Pricing & Actions Row */}
                      <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-1.5">
                        <div>
                          <span className="text-[9px] uppercase font-semibold text-slate-400 dark:text-slate-500 block leading-tight">
                            {badgeType === 'FOR_SALE' ? 'Price' : badgeType === 'BIDDING' ? 'Starting Bid' : 'Status'}
                          </span>
                          <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white">
                            {badgeType === 'FOR_SALE'
                              ? `LKR ${displayPrice.toLocaleString()}`
                              : fallbackDisplayPrice}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Direct WhatsApp Action for For Sale & Bidding */}
                          {(() => {
                            if (badgeType !== 'FOR_SALE' && badgeType !== 'BIDDING') return null;

                            const rawPhone = artwork.profiles?.phone || artwork.user?.phone || (artwork as any).artist_phone || '94783813833';
                            const cleanPhone = String(rawPhone).replace(/\D/g, '') || '94783813833';

                            const title = artwork.title || 'Artwork';
                            const rawRef = (artwork as any).ref_id || (artwork as any).art_code || artwork.id || 'N/A';
                            const refId = String(rawRef).replace(/^#/, '');
                            const cardArtist = dynamicArtistName;

                            const rawPrice = Number(artwork.price || (artwork as any).price_amount || (artwork as any).amount || (artwork as any).starting_bid || 0);
                            const priceText = rawPrice > 0 ? `LKR ${rawPrice.toLocaleString()}` : 'Not For Sale / Contact for Price';

                            const fullMessage = `Hi, I am interested in buying "${title}" (Ref ID: #${refId}) by ${cardArtist}. Listed Price: ${priceText}.`;
                            const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMessage)}`;

                            return (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#A2694E] hover:bg-[#8B5A3C] text-white shadow-sm transition-colors cursor-pointer"
                                title="Ask about price or buy on WhatsApp"
                              >
                                WhatsApp
                              </a>
                            );
                          })()}

                          {/* Details Modal CTA */}
                          <button
                            type="button"
                            onClick={() => setSelectedArtwork(artwork)}
                            className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-[#A2694E] dark:hover:text-[#C58B6F] bg-slate-100 dark:bg-slate-800 hover:bg-[#A2694E]/10 dark:hover:bg-[#A2694E]/20 border border-slate-200 dark:border-slate-700 transition-all duration-200 cursor-pointer"
                          >
                            <Maximize2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-600 dark:text-amber-400" />
                            <span>Details</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Dynamic Artwork Details Modal */}
        {selectedArtwork && (
          <GalleryArtworkDetailsModal
            artwork={selectedArtwork}
            isOpen={!!selectedArtwork}
            isAdmin={isAdmin}
            onClose={() => setSelectedArtwork(null)}
            onLike={handleLike}
            onDeleteClick={(art) => setDeletingArtwork(art)}
          />
        )}

        {/* Dynamic Artwork Deletion Modal */}
        {deletingArtwork && (
          <GalleryDeleteModal
            artwork={deletingArtwork}
            isOpen={!!deletingArtwork}
            onClose={() => setDeletingArtwork(null)}
            onDeleted={handleArtworkDeletedCallback}
          />
        )}

        {/* Dynamic Admin Artwork Upload Modal */}
        {isUploadOpen && (
          <GalleryUploadModal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            currentUserId={currentUserId}
            onArtworkUploaded={handleArtworkUploaded}
          />
        )}
      </div>
    </div>
  );
}
