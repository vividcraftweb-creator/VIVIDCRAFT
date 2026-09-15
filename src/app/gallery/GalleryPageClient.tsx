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
  Trash2,
  UploadCloud,
  AlertTriangle,
  FileText,
  Tag,
  Gavel,
  Filter,
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
import { getArtworkPricingDisplay } from '@/lib/artworks';

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
  profiles?: {
    full_name?: string | null;
    artist_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
  } | null;
  artist: ArtworkArtist;
}

export default function GalleryPageClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeSort, setActiveSort] = useState<SortOption>('popular');
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('ALL');
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
  const [uploadImageUrl, setUploadImageUrl] = useState('');
  const [uploadArtistName, setUploadArtistName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSellingMode, setUploadSellingMode] = useState<'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE'>('NOT_FOR_SALE');
  const [uploadPrice, setUploadPrice] = useState('');
  const [uploadStartingBid, setUploadStartingBid] = useState('');
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
              if (parsed?.role === 'admin' || parsed?.email === 'vividcraftweb@gmail.com') {
                setIsAdmin(true);
                setCurrentUserId('admin-vividcraft-default-id');
              }
            } catch {}
          }
        }
        return;
      }

      setCurrentUserId(user.id);
      const metaRole = (user.user_metadata?.role || '').toString().toUpperCase();
      if (metaRole === 'ADMIN' || user.email === 'vividcraftweb@gmail.com') {
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
                ? supabase.from('profiles').select('id, first_name, last_name, full_name, artist_name, avatar_url, role, title, bio, location, phone, whatsapp_number, email').in('id', artistIds)
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
              const prof = pMap.get(art.artist_id);
              const artistNameField = (prof?.artist_name || '').trim();
              const profileFullName = (prof?.full_name || '').trim();
              const combinedFirstLast = [prof?.first_name, prof?.last_name].filter(Boolean).join(' ').trim();
              const emailPrefix = prof?.email ? prof.email.split('@')[0] : '';
              const artistName = artistNameField || profileFullName || combinedFirstLast || emailPrefix || 'Verified Artist';


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
                  full_name: profileFullName,
                  artist_name: artistNameField || null,
                  avatar_url: prof?.avatar_url || null,
                  role: prof?.role || 'artist',
                } : null,
                artist: {
                  id: art.artist_id,
                  name: artistName,
                  avatar_url: prof?.avatar_url || null,
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (art) =>
          art.title.toLowerCase().includes(q) ||
          art.artist.name.toLowerCase().includes(q) ||
          (art.art_code && art.art_code.toLowerCase().includes(q))
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
  }, [localArtworks, searchQuery, activeSort, activeFilter]);


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
      const res = await fetch('/api/admin/delete-artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId: deletingArtwork.id,
          artistId: deletingArtwork.artist_id,
          reason,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to delete artwork');
      }

      // Optimistic UI removal without breaking page state
      setLocalArtworks((prev) => prev.filter((a) => a.id !== deletingArtwork.id));
      if (selectedArtwork && selectedArtwork.id === deletingArtwork.id) {
        setSelectedArtwork(null);
      }

      toast.success('Artwork Removed by Admin', {
        description: `"${deletingArtwork.title}" was removed. Deletion reason was dispatched to the artist.`,
      });

      setDeletingArtwork(null);
      setDeleteReason('');
      utils.artworks.getAllArtworks.invalidate();
    } catch (err: any) {
      console.error('Delete artwork error:', err);
      toast.error('Failed to remove artwork: ' + err.message);
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

      let { error: insertError } = await supabase
        .from('artworks')
        .insert({
          id: newId,
          artist_id: artistId,
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || null,
          image_url: finalImageUrl,
          created_at: now,
          selling_mode: uploadSellingMode,
          pricing_type: uploadSellingMode,
          price,
          starting_bid: startingBid,
          art_code: artCode,
        });

      if (insertError) {
        console.warn('Direct insert dual mode failed, trying with pricing_type only:', insertError);
        const retry1 = await supabase
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
          });
        insertError = retry1.error;
      }

      if (insertError) {
        console.warn('Direct insert pricing_type failed, trying with selling_mode only:', insertError);
        const retry2 = await supabase
          .from('artworks')
          .insert({
            id: newId,
            artist_id: artistId,
            title: uploadTitle.trim(),
            description: uploadDescription.trim() || null,
            image_url: finalImageUrl,
            created_at: now,
            selling_mode: uploadSellingMode,
            price,
            starting_bid: startingBid,
            art_code: artCode,
          });
        insertError = retry2.error;
      }

      if (insertError) {
        console.warn('Direct insert without extra metadata, preserving pricing:', insertError);
        const retry3 = await supabase
          .from('artworks')
          .insert({
            id: newId,
            artist_id: artistId,
            title: uploadTitle.trim(),
            image_url: finalImageUrl,
            created_at: now,
            selling_mode: uploadSellingMode,
            pricing_type: uploadSellingMode,
            price,
            starting_bid: startingBid,
          });
        insertError = retry3.error;
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
        });

        if (retryBasic.error) {
          console.error("Supabase Insert Error:", retryBasic.error);
          if (uploadedFileName) {
            await supabase.storage.from('artworks').remove([uploadedFileName]);
          }
          throw retryBasic.error;
        }
      }

      const newArtwork: RankedArtwork = {
        id: newId,
        artist_id: artistId,
        title: uploadTitle.trim(),
        description: uploadDescription.trim() || null,
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
        artist: {
          id: artistId,
          name: uploadArtistName.trim() || 'Vivid Art Curation',
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
      setUploadImageUrl('');
      setUploadArtistName('');
      setUploadFile(null);
      setUploadSellingMode('NOT_FOR_SALE');
      setUploadPrice('');
      setUploadStartingBid('');
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 pt-28 pb-24 relative overflow-hidden transition-colors duration-300">
      {/* Background aesthetic gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-amber-500/10 via-yellow-500/5 to-transparent dark:from-amber-600/15 dark:via-yellow-600/10 dark:to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-amber-500/5 dark:bg-amber-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-48 w-96 h-96 bg-yellow-500/5 dark:bg-yellow-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Admin Floating Banner (Active Session Indicator) */}
      {isAdmin && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-amber-500/10 dark:bg-gradient-to-r dark:from-amber-500/15 dark:via-amber-500/10 dark:to-amber-500/10 border border-amber-500/30 rounded-2xl backdrop-blur-md shadow-sm">
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
                onClick={() => setIsUploadOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 px-3 gap-1.5 shadow-md cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-950" />
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
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-semibold tracking-wide uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
            Vivid Art Gallery &amp; Exhibition
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Curated Artworks &amp; Portfolios
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal">
            Discover ranked original creations from verified artists. Like your favorites, rate remarkable pieces, and commission top talent.
          </p>

          {/* Search Bar & Admin Quick Upload */}
          <div className="pt-2 max-w-xl mx-auto flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search artworks by title or artist name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 h-12 bg-white dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 focus:border-amber-500 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm shadow-md dark:shadow-xl focus:ring-2 focus:ring-amber-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md cursor-pointer border border-slate-200 dark:border-transparent"
                >
                  Clear
                </button>
              )}
            </div>

            {isAdmin && (
              <Button
                onClick={() => setIsUploadOpen(true)}
                className="h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 rounded-2xl gap-2 shadow-lg shadow-amber-500/25 cursor-pointer flex-shrink-0"
              >
                <UploadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">Upload Art</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filter Tabs / Sort Controls */}
        <div className="flex flex-col gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800/80">
          {/* Row 1 — Sort Tabs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 p-1 bg-slate-200/70 dark:bg-slate-900/90 border border-slate-300/70 dark:border-slate-800 rounded-2xl overflow-x-auto max-w-full">
              <button
                onClick={() => setActiveSort('popular')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeSort === 'popular'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/60'
                }`}
              >
                <Flame className="w-4 h-4 text-orange-600 dark:text-orange-500" />
                <span>Most Popular</span>
              </button>

              <button
                onClick={() => setActiveSort('highest_rated')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeSort === 'highest_rated'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/60'
                }`}
              >
                <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-500 fill-current" />
                <span>Highest Rated</span>
              </button>

              <button
                onClick={() => setActiveSort('most_liked')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeSort === 'most_liked'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/60'
                }`}
              >
                <Heart className="w-4 h-4 text-rose-500 dark:text-rose-400 fill-rose-500 dark:fill-rose-400" />
                <span>Most Liked</span>
              </button>

              <button
                onClick={() => setActiveSort('newest')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  activeSort === 'newest'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
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
              onClick={() => setActiveFilter('ALL')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                activeFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>All Artworks</span>
            </button>

            <button
              onClick={() => setActiveFilter('FIXED_PRICE')}
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
              onClick={() => setActiveFilter('BIDDING')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                activeFilter === 'BIDDING'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                  : 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-400 dark:hover:border-amber-500'
              }`}
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>Open Bidding</span>
            </button>

            <button
              onClick={() => setActiveFilter('NOT_FOR_SALE')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                activeFilter === 'NOT_FOR_SALE'
                  ? 'bg-slate-500 text-white border-slate-500 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              <span>Not For Sale</span>
            </button>
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
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-2"
              >
                <UploadCloud className="w-4 h-4 text-slate-950" />
                <span>Upload First Artwork</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedArtworks.map((artwork) => {
              // Step 2: Log artwork database object directly to console to verify column names
              console.log('Artwork database object (GalleryCard):', {
                id: artwork.id,
                title: artwork.title,
                price: artwork.price,
                pricing_type: artwork.pricing_type,
                selling_type: (artwork as any).selling_type || artwork.selling_mode,
                amount: (artwork as any).amount,
              });

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
                  className="group relative bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-amber-400/80 dark:hover:border-amber-500/50 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-amber-500/10 flex flex-col hover:-translate-y-0.5"
                >
                  {/* Artwork Image Container with Smart Matte Framing & Blurred Backdrop */}
                  <div
                    onClick={() => setSelectedArtwork(artwork)}
                    className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900/5 dark:bg-slate-950 cursor-pointer select-none"
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
                    <div className="relative z-10 w-full h-full p-2.5 flex items-center justify-center">
                      <div className="relative w-full h-full flex items-center justify-center border border-slate-900/10 dark:border-white/10 rounded-md overflow-hidden bg-black/5 dark:bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={safeImg}
                          alt={artwork.title}
                          className="object-contain w-full h-full relative z-10 p-2 filter drop-shadow-md transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = DEFAULT_ARTWORK_PLACEHOLDER;
                          }}
                        />
                      </div>
                    </div>

                    {/* In-situ Admin Moderation Control ("Delete Post") */}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingArtwork(artwork);
                          setDeleteReason('');
                        }}
                        className="absolute top-3 left-3 z-30 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-[11px] font-bold shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-pointer"
                        title="Admin Moderation: Delete Post with Reason"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Post</span>
                      </button>
                    )}

                    {/* Top hover action: Maximize button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedArtwork(artwork);
                      }}
                      className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:bg-amber-500 hover:text-slate-950 hover:border-amber-400 cursor-pointer shadow-lg"
                      title="View full screen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>

                    {/* Bottom hover action: Quick Rate Stars */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-3 left-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-between bg-slate-950/85 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white shadow-lg"
                    >
                      <span className="text-[11px] text-slate-300 font-medium">Rate:</span>
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

                  {/* Glassmorphism Card Overlay & Formal Details Panel */}
                  <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 p-4 flex flex-col flex-1 justify-between gap-3">
                    <div>
                      {/* Title & Status Badge Row */}
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          onClick={() => setSelectedArtwork(artwork)}
                          className="truncate font-semibold text-slate-900 dark:text-slate-100 text-base cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex-1"
                          title={artwork.title}
                        >
                          {artwork.title}
                        </h3>

                        {(() => {
                          const { statusBadge, badgeType } = getArtworkPricingDisplay(artwork);
                          return (
                            <>
                              {badgeType === 'FOR_SALE' && (
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                                  {statusBadge}
                                </span>
                              )}
                              {badgeType === 'BIDDING' && (
                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                                  {statusBadge}
                                </span>
                              )}
                              {badgeType === 'NOT_FOR_SALE' && (
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full flex-shrink-0">
                                  {statusBadge}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* Price Display for Fixed Price & Bidding Artworks */}
                      {(() => {
                        const { displayPrice, badgeType } = getArtworkPricingDisplay(artwork);
                        return (
                          <>
                            {badgeType === 'FOR_SALE' && (() => {
                              const displayPrice = Number(artwork.price || (artwork as any).priceAmount || (artwork as any).price_amount || (artwork as any).amount || 0);
                              return (
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                  Price: LKR {displayPrice.toLocaleString()}
                                </p>
                              );
                            })()}
                            {badgeType === 'BIDDING' && (
                              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                                {displayPrice}
                              </p>
                            )}
                            {badgeType === 'NOT_FOR_SALE' && (
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                Price: Display Only
                              </p>
                            )}
                          </>
                        );
                      })()}

                      {/* Artist Row & Ref ID */}
                      <div className="flex items-center justify-between gap-2.5 mt-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Link
                            href={`/freelancers/${artwork.artist_id}`}
                            className="flex-shrink-0 group/avatar"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Avatar className="w-7 h-7 ring-1 ring-amber-500/30 group-hover/avatar:ring-amber-400 transition-all">
                              {artistAvatar && <AvatarImage src={artistAvatar} alt={artwork.artist.name} />}
                              <AvatarFallback className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 text-xs font-semibold">
                                {initials || <User className="w-3.5 h-3.5" />}
                              </AvatarFallback>
                            </Avatar>
                          </Link>

                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/freelancers/${artwork.artist_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 truncate block transition-colors"
                            >
                              {(() => {
                                const rawName = artwork.profiles?.artist_name || artwork.profiles?.full_name || artwork.artist?.name;
                                return (rawName && rawName !== 'Artist' && rawName !== 'Artist / Creator') ? rawName : 'Verified Artist';
                              })()}
                            </Link>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {artwork.artist.title && artwork.artist.title !== 'Artist / Creator' ? artwork.artist.title : 'Verified Artist'}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                          Ref ID: {artwork.art_code || '#ART-101'}
                        </span>
                      </div>
                    </div>

                    {/* Stats & Actions Footer (Rounded Pill Containers) */}
                    <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {/* Interactive Like Button */}
                        <button
                          type="button"
                          onClick={(e) => handleLike(artwork.id, e)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                            artwork.isLiked
                              ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 shadow-sm'
                              : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-300 hover:border-rose-300 dark:hover:border-rose-500/40'
                          }`}
                          title={artwork.isLiked ? 'Unlike artwork' : 'Like artwork'}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 transition-transform active:scale-125 ${
                              artwork.isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-400 dark:text-slate-500'
                            }`}
                          />
                          <span>{artwork.likesCount}</span>
                          <span className="sr-only">likes</span>
                        </button>

                        {/* Average Rating Display */}
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/25 shadow-sm"
                          title={`Average rating: ${artwork.averageRating} from ${artwork.ratingsCount} review(s)`}
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {artwork.averageRating > 0 ? artwork.averageRating.toFixed(1) : '—'}
                          </span>
                        </div>
                      </div>

                      {/* WhatsApp Inquiry Action for Fixed Price & For Sale Artworks */}
                      {(() => {
                        const { badgeType, displayPrice } = getArtworkPricingDisplay(artwork);
                        if (badgeType !== 'FOR_SALE' && badgeType !== 'BIDDING') return null;
                        return (
                          <a
                            href={`https://wa.me/${artwork.artist.whatsapp_number ? artwork.artist.whatsapp_number.replace(/[^0-9]/g, '') : '94783813833'}?text=${encodeURIComponent(
                              `Hello! I would like to inquire about Artwork '${artwork.title}' (ID: ${artwork.art_code || '#ART-101'}) by artist ${artwork.artist.name}. Status: ${displayPrice}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-colors cursor-pointer"
                            title="Ask about price or buy on WhatsApp"
                          >
                            <span>Ask Price (WhatsApp)</span>
                          </a>
                        );
                      })()}
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
            className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
            onClick={() => setSelectedArtwork(null)}
          >
            <div
              className="relative max-w-4xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-[100000] flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-10 h-10 ring-1 ring-amber-500/30 flex-shrink-0">
                    <AvatarImage
                      src={getProfilePictureUrl(selectedArtwork.artist_id, selectedArtwork.artist.avatar_url)}
                      alt={selectedArtwork.artist.name}
                    />
                    <AvatarFallback className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold">
                      {selectedArtwork.artist.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
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
                        by {(() => {
                          const rawName = (selectedArtwork as any).profiles?.artist_name || (selectedArtwork as any).profiles?.full_name || selectedArtwork.artist?.name;
                          return (rawName && rawName !== 'Artist' && rawName !== 'Artist / Creator') ? rawName : 'Verified Artist';
                        })()}
                      </Link>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        • Ref ID: {selectedArtwork.art_code || '#ART-101'}
                      </span>
                      {(() => {
                        const { displayPrice, badgeType } = getArtworkPricingDisplay(selectedArtwork);
                        return (
                          <>
                            {badgeType === 'FOR_SALE' && (() => {
                              const displayPrice = Number(selectedArtwork.price || (selectedArtwork as any).priceAmount || (selectedArtwork as any).price_amount || (selectedArtwork as any).amount || 0);
                              return (
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  • Price: LKR {displayPrice.toLocaleString()}
                                </span>
                              );
                            })()}
                            {badgeType === 'BIDDING' && (
                              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                • {displayPrice}
                              </span>
                            )}
                            {badgeType === 'NOT_FOR_SALE' && (
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                • Price: Display Only
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
                      const name = profile?.artist_name || profile?.full_name || selectedArtwork.artist?.name || 'Verified Artist';
                      const bio = profile?.bio || profile?.headline || profile?.title || selectedArtwork.artist?.bio || selectedArtwork.artist?.title || 'Visual artist & creator on JobHorizons.';
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
              <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                    const { badgeType, displayPrice } = getArtworkPricingDisplay(selectedArtwork);
                    if (badgeType !== 'FOR_SALE' && badgeType !== 'BIDDING') return null;
                    return (
                      <a
                        href={`https://wa.me/${selectedArtwork.artist.whatsapp_number ? selectedArtwork.artist.whatsapp_number.replace(/[^0-9]/g, '') : '94783813833'}?text=${encodeURIComponent(
                          `Hello! I would like to inquire about Artwork '${selectedArtwork.title}' (ID: ${selectedArtwork.art_code || '#ART-101'}) by artist ${selectedArtwork.artist.name}. Status: ${displayPrice}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto"
                      >
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2 h-10 px-4 cursor-pointer shadow-sm">
                          <span>Ask Price (WhatsApp)</span>
                        </Button>
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
                    placeholder="e.g. Vivid Art Studio, Master Artist"
                    value={uploadArtistName}
                    onChange={(e) => setUploadArtistName(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm h-11 focus-visible:ring-amber-500"
                  />
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
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-2 cursor-pointer shadow-md"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Publishing to Gallery...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
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
