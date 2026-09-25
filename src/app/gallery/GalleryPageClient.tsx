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
  AlertTriangle,
  FileText,
  Tag,
  Gavel,
  Filter,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { createClient } from '@/lib/supabase/client';
import { getSafeArtworkUrl, DEFAULT_ARTWORK_PLACEHOLDER } from '@/lib/image-placeholders';
import { getProfilePictureUrl } from '@/lib/profile-helpers';
import { getArtworkPricingDisplay, extractArtistName } from '@/lib/artworks';

type SortOption = 'popular' | 'highest_rated' | 'most_liked' | 'newest';
type CategoryFilter = 'ALL' | 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE';

interface ArtworkArtist {
  id: string;
  name: string;
  avatar_url: string | null;
  title?: string;
  role?: string;
  bio?: string | null;
  location?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
}

interface RankedArtwork {
  id: string;
  artist_id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  medium?: string | null;
  technique?: string | null;
  tags?: string[] | null;
  image_url: string;
  created_at: string;
  likesCount: number;
  ratingsCount: number;
  averageRating: number;
  userRating: number | null;
  isLiked: boolean;
  popularityScore?: number;
  selling_mode?: string;
  pricing_type?: string;
  price?: number | null;
  starting_bid?: number | null;
  art_code?: string;
  badge_title?: string | null;
  gig_title?: string | null;
  base_rating?: number | null;
  review_count_text?: string | null;
  profiles?: {
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    display_name?: string | null;
    username?: string | null;
    phone?: string | null;
    whatsapp_number?: string | null;
    artist_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
    [key: string]: any;
  } | null;
  user?: {
    phone?: string | null;
    [key: string]: any;
  } | null;
  user_name?: string | null;
  artist: ArtworkArtist;
}

export default function GalleryPageClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeSort, setActiveSort] = useState<SortOption>('popular');
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('ALL');
  const [selectedMedium, setSelectedMedium] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState<RankedArtwork | null>(null);
  const [hoveredRating, setHoveredRating] = useState<{ [key: string]: number }>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Local state for instant optimistic updates
  const [localArtworks, setLocalArtworks] = useState<RankedArtwork[]>([]);

  // Deletion Modal state (Admin In-Situ Moderation)
  const [deletingArtwork, setDeletingArtwork] = useState<RankedArtwork | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Admin Upload Modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadMedium, setUploadMedium] = useState('');
  const [uploadTechnique, setUploadTechnique] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadImageUrl, setUploadImageUrl] = useState('');
  const [uploadArtistName, setUploadArtistName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSellingMode, setUploadSellingMode] = useState<'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE'>('FIXED_PRICE');
  const [uploadPrice, setUploadPrice] = useState('');
  const [uploadStartingBid, setUploadStartingBid] = useState('');
  const [uploadBadgeTitle, setUploadBadgeTitle] = useState('Top Rated');
  const [uploadGigTitle, setUploadGigTitle] = useState('');
  const [uploadBaseRating, setUploadBaseRating] = useState('4.9');
  const [uploadReviewCountText, setUploadReviewCountText] = useState('(1k+)');
  const [isUploading, setIsUploading] = useState(false);

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

  // Prevent background page scrolling when modal is open
  useEffect(() => {
    if (!selectedArtwork) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedArtwork(null);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedArtwork]);

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
              .select('*, profiles:user_id(id, first_name, last_name, avatar_url, role)')
              .order('created_at', { ascending: false });
            if (!res.error && res.data && res.data.length > 0) {
              arts = res.data;
            }
          } catch {}

          if (!arts || arts.length === 0) {
            try {
              const res = await supabase
                .from('artworks')
                .select('*, profiles:artist_id(id, first_name, last_name, avatar_url, role)')
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
            const artistIds = Array.from(new Set(arts.map((a: any) => a.user_id || a.artist_id).filter(Boolean)));

            const [likesRes, ratingsRes, profilesRes] = await Promise.all([
              supabase.from('artwork_likes').select('artwork_id, user_id').in('artwork_id', artIds),
              supabase.from('artwork_ratings').select('artwork_id, user_id, rating').in('artwork_id', artIds),
              artistIds.length > 0
                ? supabase.from('profiles').select('id, first_name, last_name, full_name, display_name, username, artist_name, avatar_url, role, title, bio, location, phone, whatsapp_number, email').in('id', artistIds)
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
              const prof = pMap.get(art.user_id) || pMap.get(art.artist_id) || art.profiles;
              const artistName = extractArtistName({ ...art, profiles: prof });


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
                  display_name: profileDisplayName || null,
                  username: profileUsername || null,
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

  // Handle Admin Reasoned Deletion
  const handleConfirmDelete = async () => {
    if (!deletingArtwork) return;
    setIsDeleting(true);

    const reason = deleteReason.trim() || 'Content removed by administrator in violation of community guidelines.';

    try {
      const supabase = createClient();
      try {
        await supabase.from('artwork_likes').delete().eq('artwork_id', deletingArtwork.id);
      } catch {}
      try {
        await supabase.from('artwork_ratings').delete().eq('artwork_id', deletingArtwork.id);
      } catch {}
      try {
        await supabase.from('artwork_comments').delete().eq('artwork_id', deletingArtwork.id);
      } catch {}

      const { error } = await supabase.from('artworks').delete().eq('id', deletingArtwork.id);

      // Also trigger admin server action for notification/cleanup
      fetch('/api/admin/delete-artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId: deletingArtwork.id,
          artistId: deletingArtwork.artist_id,
          reason,
        }),
      }).catch(() => {});

      if (error) {
        console.error('Delete error:', error);
        alert('Delete failed: ' + error.message);
      } else {
        // Force window reload to immediately purge client/server cache across all sessions
        window.location.href = window.location.pathname + '?refresh=' + Date.now();
      }
    } catch (err: any) {
      console.error('Delete artwork error:', err);
      alert('Delete failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Admin Artwork Upload
  const handleAdminUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      toast.error('Please enter an artwork title.');
      return;
    }

    if (!uploadFile && !uploadImageUrl.trim()) {
      toast.error('Please upload an image file or provide an image URL.');
      return;
    }

    if (uploadSellingMode === 'FIXED_PRICE' && (!uploadPrice || Number(uploadPrice) <= 0)) {
      toast.error('Please enter a valid price amount in LKR.');
      return;
    }

    if (uploadSellingMode === 'BIDDING' && (!uploadStartingBid || Number(uploadStartingBid) <= 0)) {
      toast.error('Please enter a valid starting bid amount in LKR.');
      return;
    }

    setIsUploading(true);
    let uploadedFileName: string | null = null;
    try {
      const supabase = createClient();
      let finalImageUrl = uploadImageUrl.trim();

      if (uploadFile) {
        const fileExt = uploadFile.name.split('.').pop() || 'png';
        const fileName = `admin_${crypto.randomUUID()}.${fileExt}`;
        uploadedFileName = fileName;
        const { error: uploadErr } = await supabase.storage
          .from('artworks')
          .upload(fileName, uploadFile, { cacheControl: '3600', upsert: false });

        if (uploadErr) {
          throw uploadErr;
        }

        const { data } = supabase.storage.from('artworks').getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
      }

      const newId = crypto.randomUUID();
      const artistId = currentUserId || 'admin-vividcraft-default-id';
      const now = new Date().toISOString();

      // Formatted Artwork ID (e.g., #ART-104)
      let artCode = '#ART-101';
      try {
        const { count } = await supabase.from('artworks').select('*', { count: 'exact', head: true });
        artCode = `#ART-${101 + (count || 0)}`;
      } catch {
        const hash = Math.abs(newId.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0)) % 900 + 100;
        artCode = `#ART-${hash}`;
      }

      const price = uploadSellingMode === 'FIXED_PRICE' && uploadPrice ? Number(uploadPrice) : null;
      const startingBid = uploadSellingMode === 'BIDDING' && uploadStartingBid ? Number(uploadStartingBid) : null;
      const parsedTags = uploadTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const parsedCategory = uploadCategory.trim() || null;
      const parsedMedium = uploadMedium.trim() || null;
      const parsedTechnique = uploadTechnique.trim() || null;

      let { error: insertError } = await supabase
        .from('artworks')
        .insert({
          id: newId,
          artist_id: artistId,
          user_id: artistId,
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || null,
          category: parsedCategory,
          medium: parsedMedium,
          technique: parsedTechnique,
          tags: parsedTags,
          image_url: finalImageUrl,
          created_at: now,
          selling_mode: uploadSellingMode,
          pricing_type: uploadSellingMode,
          price,
          starting_bid: startingBid,
          art_code: artCode,
          badge_title: uploadBadgeTitle.trim() || 'Top Rated',
          gig_title: uploadGigTitle.trim() || null,
          base_rating: uploadBaseRating ? parseFloat(uploadBaseRating) : 4.9,
          review_count_text: uploadReviewCountText.trim() || '(1k+)',
          ...(price && price > 0 ? { amount: price } : {}),
        });

      if (insertError) {
        console.warn('Direct insert dual mode with technique failed, trying without technique:', insertError);
        const retry1 = await supabase
          .from('artworks')
          .insert({
            id: newId,
            artist_id: artistId,
            user_id: artistId,
            title: uploadTitle.trim(),
            description: uploadDescription.trim() || null,
            category: parsedCategory,
            medium: parsedMedium,
            tags: parsedTags,
            image_url: finalImageUrl,
            created_at: now,
            selling_mode: uploadSellingMode,
            pricing_type: uploadSellingMode,
            price,
            starting_bid: startingBid,
            art_code: artCode,
            badge_title: uploadBadgeTitle.trim() || 'Top Rated',
            gig_title: uploadGigTitle.trim() || null,
            base_rating: uploadBaseRating ? parseFloat(uploadBaseRating) : 4.9,
            review_count_text: uploadReviewCountText.trim() || '(1k+)',
          });
        insertError = retry1.error;
      }

      if (insertError) {
        console.warn('Direct insert with metadata failed, trying pricing_type only:', insertError);
        const retry2 = await supabase
          .from('artworks')
          .insert({
            id: newId,
            artist_id: artistId,
            title: uploadTitle.trim(),
            description: uploadDescription.trim() || null,
            image_url: finalImageUrl,
            created_at: now,
            pricing_type: uploadSellingMode,
            price,
            starting_bid: startingBid,
            art_code: artCode,
            badge_title: uploadBadgeTitle.trim() || 'Top Rated',
            gig_title: uploadGigTitle.trim() || null,
            base_rating: uploadBaseRating ? parseFloat(uploadBaseRating) : 4.9,
            review_count_text: uploadReviewCountText.trim() || '(1k+)',
          });
        insertError = retry2.error;
      }

      if (insertError) {
        console.warn('Fallback to basic insert:', insertError);
        const retryBasic = await supabase.from('artworks').insert({
          id: newId,
          artist_id: artistId,
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || null,
          image_url: finalImageUrl,
          created_at: now,
          pricing_type: uploadSellingMode,
          price,
          starting_bid: startingBid,
          badge_title: uploadBadgeTitle.trim() || 'Top Rated',
          gig_title: uploadGigTitle.trim() || null,
          base_rating: uploadBaseRating ? parseFloat(uploadBaseRating) : 4.9,
          review_count_text: uploadReviewCountText.trim() || '(1k+)',
        });

        if (retryBasic.error) {
          console.warn('Fallback with price failed, trying amount column:', retryBasic.error);
          const retryAmount = await supabase.from('artworks').insert({
            id: newId,
            artist_id: artistId,
            title: uploadTitle.trim(),
            description: uploadDescription.trim() || null,
            image_url: finalImageUrl,
            created_at: now,
            pricing_type: uploadSellingMode,
            amount: price,
            starting_bid: startingBid,
            badge_title: uploadBadgeTitle.trim() || 'Top Rated',
            gig_title: uploadGigTitle.trim() || null,
            base_rating: uploadBaseRating ? parseFloat(uploadBaseRating) : 4.9,
            review_count_text: uploadReviewCountText.trim() || '(1k+)',
          });

          if (retryAmount.error) {
            console.error("Supabase Insert Error:", retryAmount.error);
            if (uploadedFileName) {
              await supabase.storage.from('artworks').remove([uploadedFileName]);
            }
            throw retryAmount.error;
          }
        }
      }

      const newArtwork: RankedArtwork = {
        id: newId,
        artist_id: artistId,
        title: uploadTitle.trim(),
        description: uploadDescription.trim() || null,
        category: parsedCategory,
        medium: parsedMedium,
        technique: parsedTechnique,
        tags: parsedTags,
        image_url: finalImageUrl,
        created_at: now,
        likesCount: 0,
        ratingsCount: 0,
        averageRating: 0,
        userRating: null,
        isLiked: false,
        popularityScore: 0,
        selling_mode: uploadSellingMode,
        pricing_type: uploadSellingMode,
        price,
        starting_bid: startingBid,
        art_code: artCode,
        badge_title: uploadBadgeTitle.trim() || 'Top Rated',
        gig_title: uploadGigTitle.trim() || null,
        base_rating: uploadBaseRating ? parseFloat(uploadBaseRating) : 4.9,
        review_count_text: uploadReviewCountText.trim() || '(1k+)',
        artist: {
          id: artistId,
          name: uploadArtistName.trim() || 'Cinnamon Gallery Curation',
          avatar_url: null,
          title: 'Curator / Admin',
          role: 'ADMIN',
        },
      };

      if (uploadSellingMode !== 'BIDDING') {
        setLocalArtworks((prev) => [newArtwork, ...prev]);
        toast.success('Artwork Published to Gallery!', {
          description: `"${uploadTitle.trim()}" (${artCode}) is now live in the gallery.`,
        });
      } else {
        toast.success('Artwork Published to Bidding!', {
          description: `"${uploadTitle.trim()}" (${artCode}) is now live in the Bidding gallery (/bidding).`,
        });
      }

      // Reset form & close
      setUploadTitle('');
      setUploadDescription('');
      setUploadCategory('');
      setUploadMedium('');
      setUploadTechnique('');
      setUploadTags('');
      setUploadImageUrl('');
      setUploadArtistName('');
      setUploadFile(null);
      setUploadSellingMode('NOT_FOR_SALE');
      setUploadPrice('');
      setUploadStartingBid('');
      setUploadBadgeTitle('Top Rated');
      setUploadGigTitle('');
      setUploadBaseRating('4.9');
      setUploadReviewCountText('(1k+)');
      setIsUploadOpen(false);

      utils.artworks.getAllArtworks.invalidate();
    } catch (err: any) {
      console.error("Supabase Insert Error:", err);
      if (uploadedFileName) {
        try {
          const supabase = createClient();
          await supabase.storage.from('artworks').remove([uploadedFileName]);
        } catch {}
      }
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden animate-pulse shadow-sm"
              >
                <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800/60" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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

              const activeHoverStar = hoveredRating[artwork.id] || 0;
              const artworkTitle = (artwork.title || 'Untitled Artwork').trim();
              const hasRealRatings =
                typeof artwork.ratingsCount === 'number' &&
                artwork.ratingsCount > 0 &&
                typeof artwork.averageRating === 'number' &&
                artwork.averageRating > 0;
              const { statusBadge, displayPrice, badgeType } = getArtworkPricingDisplay(artwork);

              return (
                <div
                  key={artwork.id}
                  className="group relative bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-amber-400/80 dark:hover:border-amber-500/50 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-amber-500/10 flex flex-col hover:-translate-y-0.5"
                >
                  {/* Artwork Image Container with Smart Matte Framing */}
                  <div
                    onClick={() => setSelectedArtwork(artwork)}
                    className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900/5 dark:bg-slate-950 cursor-pointer select-none"
                  >
                    {/* Background blurred layer using the SAME artwork image URL */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={safeImg}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover blur-xl scale-125 opacity-40 dark:opacity-50 pointer-events-none transition-transform duration-700 ease-out group-hover:scale-150"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = DEFAULT_ARTWORK_PLACEHOLDER;
                        }}
                      />
                    </div>

                    {/* Exhibition Inner Matte Border Wrapping Foreground Image */}
                    <div className="relative z-10 w-full h-full p-2 flex items-center justify-center">
                      <div className="relative w-full h-full flex items-center justify-center border border-slate-900/10 dark:border-white/10 rounded-md overflow-hidden bg-black/5 dark:bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={safeImg}
                          alt={artworkTitle}
                          className="object-contain w-full h-full relative z-10 p-1.5 filter drop-shadow-md transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = DEFAULT_ARTWORK_PLACEHOLDER;
                          }}
                        />
                      </div>
                    </div>

                    {/* Top-Left Pricing Status Badge & Admin Delete Button */}
                    <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 pointer-events-auto">
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingArtwork(artwork);
                            setDeleteReason('');
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-[10px] font-bold shadow-md backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-pointer"
                          title="Admin Moderation: Delete Post with Reason"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}

                      {badgeType === 'FOR_SALE' && (
                        <span className="text-[10px] font-bold text-amber-950 dark:text-amber-300 bg-amber-400/90 dark:bg-amber-500/25 border border-amber-500/40 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md">
                          {statusBadge}
                        </span>
                      )}
                      {badgeType === 'BIDDING' && (
                        <span className="text-[10px] font-bold text-white bg-orange-500/90 dark:bg-orange-500/30 dark:text-orange-300 border border-orange-500/50 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md">
                          {statusBadge}
                        </span>
                      )}
                      {badgeType === 'NOT_FOR_SALE' && (
                        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md">
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
                      className="absolute bottom-2.5 right-2.5 z-30 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:bg-[#A2694E] hover:text-white hover:border-[#A2694E] cursor-pointer shadow-lg"
                      title="View full screen"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Clean Artwork Details Panel */}
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/60 dark:border-slate-800/60 p-3.5 flex flex-col flex-1 justify-between gap-2.5">
                    <div className="space-y-2">
                      {/* Artist Row: Avatar + Name */}
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/freelancers/${artwork.artist_id}`}
                          className="flex-shrink-0 group/avatar"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Avatar className="w-6 h-6 ring-1 ring-amber-500/30 group-hover/avatar:ring-amber-400 transition-all">
                            {artistAvatar && <AvatarImage src={artistAvatar} alt={dynamicArtistName} />}
                            <AvatarFallback className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 text-[10px] font-semibold">
                              {initials || <User className="w-3 h-3" />}
                            </AvatarFallback>
                          </Avatar>
                        </Link>

                        <Link
                          href={`/freelancers/${artwork.artist_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 truncate block transition-colors"
                        >
                          {dynamicArtistName}
                        </Link>
                      </div>

                      {/* Dynamic Artwork Title */}
                      <h3
                        onClick={() => setSelectedArtwork(artwork)}
                        className="font-medium text-slate-900 dark:text-slate-100 text-sm hover:text-amber-600 dark:hover:text-amber-400 line-clamp-2 cursor-pointer transition-colors leading-snug"
                        title={artworkTitle}
                      >
                        {artworkTitle}
                      </h3>

                      {/* Visible Metrics Row: Real Likes Count & Actual Total Reviews from Database */}
                      <div className="flex items-center gap-3 text-xs pt-1 select-none">
                        {/* Interactive Like Action & Real Likes Count */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleLike(artwork, e)}
                          className={`inline-flex items-center gap-1.5 transition-colors cursor-pointer group/like ${
                            artwork.isLiked
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                          }`}
                          title={artwork.isLiked ? 'Unlike this artwork' : 'Like this artwork'}
                          aria-label={`${artwork.likesCount} likes`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 transition-transform group-hover/like:scale-110 active:scale-125 ${
                              artwork.isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-400 dark:text-slate-500 group-hover/like:text-rose-500'
                            }`}
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                            {artwork.likesCount}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {artwork.likesCount === 1 ? 'like' : 'likes'}
                          </span>
                        </button>

                        <span className="text-slate-300 dark:text-slate-700 font-light">•</span>

                        {/* Dynamic Reviews Metric from Database */}
                        <div
                          className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400"
                          title={`${artwork.ratingsCount} total reviews`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              artwork.ratingsCount > 0 ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                          {artwork.ratingsCount > 0 ? (
                            <>
                              <span className="font-bold text-slate-900 dark:text-white text-xs">
                                {Number(artwork.averageRating).toFixed(1)}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                                ({artwork.ratingsCount} {artwork.ratingsCount === 1 ? 'review' : 'reviews'})
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                              0 reviews
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Pricing & Actions */}
                    <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block leading-tight">
                          {badgeType === 'FOR_SALE' ? 'Starting at' : badgeType === 'BIDDING' ? 'Starting Bid' : 'Portfolio'}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {displayPrice}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* WhatsApp Inquiry Action for Fixed Price & For Sale Artworks */}
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#A2694E] hover:bg-[#8B5A3C] text-white shadow-sm transition-colors cursor-pointer"
                              title="Ask about price or buy on WhatsApp"
                            >
                              Ask Price (WhatsApp)
                            </a>
                          );
                        })()}

                        {/* Details Modal CTA */}
                        <button
                          type="button"
                          onClick={() => setSelectedArtwork(artwork)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700 transition-all duration-200 cursor-pointer"
                        >
                          <Maximize2 className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          <span>Details</span>
                        </button>
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
            className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/80 p-4 pt-24 md:pt-28 overflow-y-auto animate-in fade-in duration-200"
            onClick={() => setSelectedArtwork(null)}
          >
            <div
              className="relative w-full max-w-4xl max-h-[80vh] my-auto overflow-y-auto rounded-2xl bg-[#0f172a] dark shadow-2xl border border-white/10 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-30 flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0f172a]/95 backdrop-blur-md">
                <div className="flex items-center gap-3 min-w-0">
                  {(() => {
                    const modalArtistName = ((selectedArtwork as any).profiles?.full_name || (selectedArtwork as any).profiles?.display_name || (selectedArtwork as any).profiles?.username || (selectedArtwork as any).profiles?.artist_name || (selectedArtwork as any).user_name || selectedArtwork.artist?.name || 'Artist').trim();
                    const modalAvatarUrl = getProfilePictureUrl(selectedArtwork.artist_id, (selectedArtwork as any).profiles?.avatar_url || selectedArtwork.artist.avatar_url);
                    return (
                      <Avatar className="w-10 h-10 ring-1 ring-amber-500/30 flex-shrink-0">
                        {modalAvatarUrl && <AvatarImage src={modalAvatarUrl} alt={modalArtistName} />}
                        <AvatarFallback className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold">
                          {(modalArtistName || 'AR').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })()}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {(() => {
                        const { statusBadge, badgeType } = getArtworkPricingDisplay(selectedArtwork);
                        return (
                          <>
                            {badgeType === 'FOR_SALE' && (
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                                {statusBadge}
                              </span>
                            )}
                            {badgeType === 'BIDDING' && (
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-2.5 py-0.5 rounded-full">
                                {statusBadge}
                              </span>
                            )}
                            {badgeType === 'NOT_FOR_SALE' && (
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                                {statusBadge}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-tight truncate">
                      {selectedArtwork.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Link
                        href={`/freelancers/${selectedArtwork.artist_id}`}
                        className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline font-medium"
                      >
                        by {extractArtistName(selectedArtwork)}
                      </Link>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        • Ref ID: {selectedArtwork.art_code || '#ART-101'}
                      </span>
                      {(() => {
                        const { displayPrice, badgeType } = getArtworkPricingDisplay(selectedArtwork);
                        return (
                          <>
                            {badgeType === 'FOR_SALE' && (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                • Price: {displayPrice}
                              </span>
                            )}
                            {badgeType === 'BIDDING' && (
                              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                • {displayPrice}
                              </span>
                            )}
                            {badgeType === 'NOT_FOR_SALE' && (
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                • {displayPrice}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Artwork Description in Modal */}
                    <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-amber-600 dark:text-amber-400 block mb-0.5 text-[10px] uppercase tracking-wider">
                        Artwork Story &amp; Description
                      </span>
                      {selectedArtwork.description ? (
                        <p className="whitespace-pre-line text-xs">{selectedArtwork.description}</p>
                      ) : (
                        <p className="italic text-slate-400 dark:text-slate-500 text-xs">No description provided for this artwork.</p>
                      )}
                    </div>

                    {/* Full Artist Profile Info Section */}
                    {(() => {
                      const profile = (selectedArtwork as any).profiles;
                      const name = extractArtistName(selectedArtwork);
                      const bio = profile?.bio || profile?.headline || profile?.title || selectedArtwork.artist?.bio || selectedArtwork.artist?.title || 'Visual artist & creator on Cinnamon Gallery.';
                      const location = profile?.location || profile?.address || selectedArtwork.artist?.location || 'Sri Lanka';
                      const category = (selectedArtwork as any).category || profile?.category || (profile?.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1)) : 'Visual Arts');

                      return (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-50/60 dark:bg-slate-800/50 border border-amber-200/50 dark:border-slate-700/60 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                              Artist Profile
                            </span>
                            <Link
                              href={`/freelancers/${selectedArtwork.artist_id}`}
                              className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                            >
                              View Profile &rarr;
                            </Link>
                          </div>
                          <div className="font-semibold text-slate-900 dark:text-white text-xs">{name}</div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">{bio}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                            <span>Location: <strong className="text-slate-700 dark:text-slate-300">{location}</strong></span>
                            <span>•</span>
                            <span>Category: <strong className="text-slate-700 dark:text-slate-300">{category}</strong></span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeletingArtwork(selectedArtwork);
                        setDeleteReason('');
                      }}
                      className="h-8 px-3 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Post (Admin)</span>
                    </Button>
                  )}

                  <button
                    onClick={() => setSelectedArtwork(null)}
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-200 dark:border-transparent"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Image Display */}
              <div className="relative flex-1 bg-slate-950 flex items-center justify-center min-h-[300px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getSafeArtworkUrl(selectedArtwork.image_url)}
                  alt={selectedArtwork.title}
                  className="max-h-[60vh] w-auto max-w-full object-contain"
                />
              </div>

              {/* Modal Actions Footer */}
              <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0f172a]/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                  {/* Like Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleLike(selectedArtwork.id, e)}
                    className={`gap-2 h-10 px-4 cursor-pointer ${
                      selectedArtwork.isLiked
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-semibold'
                        : 'bg-white dark:bg-transparent border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-300 dark:hover:border-rose-500/30'
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
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">
                      {selectedArtwork.averageRating > 0
                        ? selectedArtwork.averageRating.toFixed(1)
                        : 'Unrated'}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">({selectedArtwork.ratingsCount} reviews)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* WhatsApp Inquiry Action for Fixed Price & For Sale Artworks */}
                  {(() => {
                    const { badgeType } = getArtworkPricingDisplay(selectedArtwork);
                    if (badgeType !== 'FOR_SALE' && badgeType !== 'BIDDING') return null;

                    const rawPhone = (selectedArtwork as any).profiles?.phone || (selectedArtwork as any).user?.phone || (selectedArtwork as any).artist_phone || '94783813833';
                    const cleanPhone = String(rawPhone).replace(/\D/g, '') || '94783813833';

                    const title = selectedArtwork.title || 'Artwork';
                    const rawRef = (selectedArtwork as any).ref_id || (selectedArtwork as any).art_code || selectedArtwork.id || 'N/A';
                    const refId = String(rawRef).replace(/^#/, '');
                    const modalArtist = (selectedArtwork as any).profiles?.full_name || (selectedArtwork as any).artist_name || selectedArtwork.artist?.name || 'Artist';

                    // Format price safely using existing price fallback values
                    const rawPrice = Number(selectedArtwork.price || (selectedArtwork as any).price_amount || (selectedArtwork as any).amount || (selectedArtwork as any).starting_bid || 0);
                    const priceDisplay = rawPrice > 0 ? `LKR ${rawPrice.toLocaleString()}` : 'Not For Sale / Contact for Price';

                    // Build full dynamic message string
                    const fullMessage = `Hi, I am interested in buying "${title}" (Ref ID: #${refId}) by ${modalArtist}. Listed Price: ${priceDisplay}.`;
                    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMessage)}`;

                    return (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm h-10 px-4 rounded-xl cursor-pointer shadow-sm transition-colors"
                      >
                        Ask Price (WhatsApp)
                      </a>
                    );
                  })()}

                  {/* Direct Action: View Profile */}
                  <Link
                    href={`/freelancers/${selectedArtwork.artist_id}`}
                    className="w-full sm:w-auto"
                  >
                    <Button variant="outline" className="w-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-2 h-10 px-4 cursor-pointer">
                      <span>View Artist</span>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task 2: Reasoned Artwork Deletion Modal (Admin Moderation) */}
        {deletingArtwork && (
          <div
            className="fixed inset-0 z-50 bg-black/75 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => !isDeleting && setDeletingArtwork(null)}
          >
            <div
              className="relative max-w-lg w-full bg-white dark:bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl shadow-rose-950/20 dark:shadow-rose-950/40 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center flex-shrink-0 text-rose-500 dark:text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    Remove Artwork from Gallery
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    This post will be permanently deleted and the target artist will receive an official notification detailing the reason.
                  </p>
                </div>
              </div>

              {/* Artwork Summary */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getSafeArtworkUrl(deletingArtwork.image_url)}
                  alt={deletingArtwork.title}
                  className="w-12 h-12 rounded-lg object-cover bg-slate-200 dark:bg-slate-900 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{deletingArtwork.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Artist: {deletingArtwork.artist.name}</p>
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-2">
                <label htmlFor="deletion-reason" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Reason for Deletion <span className="text-rose-500 dark:text-rose-400">*</span>
                </label>
                <textarea
                  id="deletion-reason"
                  rows={3}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Explain why this artwork is being removed (sent directly to the artist's notifications)..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-rose-500 rounded-xl p-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-1 focus:ring-rose-500 focus:outline-none resize-none"
                />

                {/* Preset quick chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Copyright infringement',
                    'Inappropriate content',
                    'Low quality / Spam',
                    'Community guidelines violation',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDeleteReason(preset)}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => setDeletingArtwork(null)}
                  className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-2 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting & Notifying...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirm Deletion</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Task 3: Admin Artwork Upload Modal */}
        {isUploadOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/75 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => !isUploading && setIsUploadOpen(false)}
          >
            <div
              className="relative max-w-lg w-full bg-white dark:bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-950/20 dark:shadow-amber-950/40 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Admin Artwork Publisher</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Publish curated artwork directly to the gallery</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isUploading && setIsUploadOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center cursor-pointer border border-slate-200 dark:border-transparent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdminUpload} className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label htmlFor="art-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Artwork Title <span className="text-amber-600 dark:text-amber-400">*</span>
                  </label>
                  <Input
                    id="art-title"
                    required
                    placeholder="e.g. Celestial Symphony, Cyberpunk Metropolis"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm h-11 focus-visible:ring-amber-500"
                  />
                </div>

                {/* Service Description / Gig Title */}
                <div className="space-y-1.5">
                  <label htmlFor="upload-gig-title" className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Service Description / Gig Title (Fiverr Marketplace Style)
                  </label>
                  <Input
                    id="upload-gig-title"
                    placeholder='e.g. "I will provide professional digital art and character design"'
                    value={uploadGigTitle}
                    onChange={(e) => setUploadGigTitle(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm h-10 focus-visible:ring-amber-500"
                  />
                </div>

                {/* Gig Badge & Rating Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                  <div className="space-y-1 sm:col-span-1">
                    <label htmlFor="upload-badge-title" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                      Gig Badge
                    </label>
                    <Input
                      id="upload-badge-title"
                      placeholder='e.g. "Top Rated"'
                      value={uploadBadgeTitle}
                      onChange={(e) => setUploadBadgeTitle(e.target.value)}
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white h-8 text-xs"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {['Top Rated', 'Level 2', 'Level 1', 'Pro Seller'].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setUploadBadgeTitle(b)}
                          className={`text-[9px] px-1.5 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            uploadBadgeTitle === b
                              ? 'bg-[#A2694E] text-white font-bold border-[#A2694E]'
                              : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label htmlFor="upload-base-rating" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                      Base Rating
                    </label>
                    <Input
                      id="upload-base-rating"
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      placeholder="4.9"
                      value={uploadBaseRating}
                      onChange={(e) => setUploadBaseRating(e.target.value)}
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label htmlFor="upload-review-count" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                      Review Count
                    </label>
                    <Input
                      id="upload-review-count"
                      placeholder='e.g. "(1k+)"'
                      value={uploadReviewCountText}
                      onChange={(e) => setUploadReviewCountText(e.target.value)}
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Artwork Description */}
                <div className="space-y-1.5">
                  <label htmlFor="art-desc" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Artwork Description (Tell the story behind your creation)
                  </label>
                  <Textarea
                    id="art-desc"
                    placeholder="Share the inspiration, medium, technique, or emotional depth of this piece..."
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs min-h-[80px] focus-visible:ring-amber-500"
                  />
                </div>

                {/* Artist Attribution */}
                <div className="space-y-1.5">
                  <label htmlFor="art-artist" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Artist Attribution (Optional)
                  </label>
                  <Input
                    id="art-artist"
                    placeholder="e.g. Cinnamon Gallery Studio, Master Artist"
                    value={uploadArtistName}
                    onChange={(e) => setUploadArtistName(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm h-11 focus-visible:ring-amber-500"
                  />
                </div>

                {/* Category & Medium Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="art-category" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Palette className="w-3 h-3 text-amber-500" />
                      Category
                    </label>
                    <Input
                      id="art-category"
                      placeholder="e.g. Painting, Digital Art, Sculpture"
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="art-medium" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-500" />
                      Medium
                    </label>
                    <Input
                      id="art-medium"
                      placeholder="e.g. Oil on Canvas, Watercolor"
                      value={uploadMedium}
                      onChange={(e) => setUploadMedium(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs h-9"
                    />
                  </div>
                </div>

                {/* Technique & Tags Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="art-technique" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Technique
                    </label>
                    <Input
                      id="art-technique"
                      placeholder="e.g. Impasto, Palette Knife, Wet-on-Wet"
                      value={uploadTechnique}
                      onChange={(e) => setUploadTechnique(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="art-tags" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-500" />
                      Tags (Comma-separated)
                    </label>
                    <Input
                      id="art-tags"
                      placeholder="abstract, modern, vibrant, landscape"
                      value={uploadTags}
                      onChange={(e) => setUploadTags(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs h-9"
                    />
                  </div>
                </div>

                {/* File Upload OR URL */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Artwork Image <span className="text-amber-600 dark:text-amber-400">*</span>
                  </label>

                  {/* File Selector */}
                  <div className="p-4 border border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-xl text-center bg-slate-50/80 dark:bg-slate-950/60 transition-colors">
                    <input
                      type="file"
                      id="art-file-input"
                      accept="image/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="art-file-input"
                      className="flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ImageIcon className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        {uploadFile ? uploadFile.name : 'Click to select image file (PNG, JPG, WEBP)'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {uploadFile ? `${(uploadFile.size / 1024).toFixed(0)} KB selected` : 'or paste direct URL below'}
                      </span>
                    </label>
                  </div>

                  {/* Commission Fee Notice */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
                    Note: A standard platform service fee of 5% to 15% will be applied upon successful sale of this artwork.
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                    <span className="text-[10px] text-slate-500 uppercase">OR URL</span>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                  </div>

                  <Input
                    placeholder="https://example.com/artwork.jpg"
                    value={uploadImageUrl}
                    onChange={(e) => setUploadImageUrl(e.target.value)}
                    disabled={!!uploadFile}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm h-10 disabled:opacity-50 focus-visible:ring-amber-500"
                  />
                </div>

                {/* Selling Mode Selector & Routing Configuration */}
                <div className="space-y-2.5 pt-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Selling Mode &amp; Routing
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setUploadSellingMode('NOT_FOR_SALE')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        uploadSellingMode === 'NOT_FOR_SALE'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/40'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-bold">Not For Sale</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">In /gallery</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadSellingMode('FIXED_PRICE')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        uploadSellingMode === 'FIXED_PRICE'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Fixed Price</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">In /gallery</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadSellingMode('BIDDING')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        uploadSellingMode === 'BIDDING'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/40'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-bold text-amber-600 dark:text-amber-400">Open Bidding</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">In /bidding</div>
                    </button>
                  </div>

                  {/* Conditional Price Input */}
                  {uploadSellingMode === 'FIXED_PRICE' && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                      <label htmlFor="admin-price-input" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block">
                        Price Amount (LKR) *
                      </label>
                      <Input
                        id="admin-price-input"
                        name="price"
                        type="number"
                        min="1"
                        placeholder="e.g. 75000"
                        value={uploadPrice}
                        onChange={(e) => setUploadPrice(e.target.value)}
                        className="bg-white dark:bg-slate-950 border-emerald-500/30 text-slate-900 dark:text-white h-9 text-xs"
                      />
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        Direct purchase item will appear in /gallery.
                      </p>
                    </div>
                  )}

                  {/* Conditional Starting Bid Input */}
                  {uploadSellingMode === 'BIDDING' && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                      <label htmlFor="admin-bid-input" className="text-xs font-semibold text-amber-700 dark:text-amber-300 block">
                        Starting Bid Amount (LKR) *
                      </label>
                      <Input
                        id="admin-bid-input"
                        type="number"
                        min="1"
                        placeholder="e.g. 50000"
                        value={uploadStartingBid}
                        onChange={(e) => setUploadStartingBid(e.target.value)}
                        className="bg-white dark:bg-slate-950 border-amber-500/30 text-slate-900 dark:text-white h-9 text-xs"
                      />
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                        Item will appear exclusively on the dedicated /bidding page.
                      </p>
                    </div>
                  )}

                  {uploadSellingMode === 'NOT_FOR_SALE' && (
                    <p className="text-[11px] text-slate-500">
                      Display only in /gallery with likes, comments, and ratings enabled.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => setIsUploadOpen(false)}
                    className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUploading || (!uploadFile && !uploadImageUrl.trim()) || !uploadTitle.trim()}
                    className="bg-[#A2694E] hover:bg-[#8B5A3C] text-white font-bold gap-2 cursor-pointer shadow-md shadow-[#A2694E]/20"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Publishing to Gallery...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 text-white" />
                        <span>Publish Artwork</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
