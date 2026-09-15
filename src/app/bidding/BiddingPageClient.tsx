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
  Gavel,
  Tag,
  ArrowUpDown,
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

type SortOption = 'popular' | 'bid_low' | 'bid_high' | 'newest' | 'highest_rated';

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
  artist: ArtworkArtist;
}

export default function BiddingPageClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeSort, setActiveSort] = useState<SortOption>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState<RankedArtwork | null>(null);
  const [hoveredRating, setHoveredRating] = useState<{ [key: string]: number }>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Local state for instant optimistic updates
  const [localArtworks, setLocalArtworks] = useState<RankedArtwork[]>([]);

  // Deletion Modal state (Admin Moderation)
  const [deletingArtwork, setDeletingArtwork] = useState<RankedArtwork | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Auction Upload Modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadImageUrl, setUploadImageUrl] = useState('');
  const [uploadArtistName, setUploadArtistName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStartingBid, setUploadStartingBid] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch current user and check admin status
  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
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

  // Fetch via tRPC procedure exclusively for BIDDING mode
  const { data: remoteArtworks, isLoading, refetch } = trpc.artworks.getAllArtworks.useQuery(
    { sort: activeSort, search: searchQuery, mode: 'BIDDING' },
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
    } else if (!isLoading && !remoteArtworks) {
      setLocalArtworks([]);
    }
  }, [remoteArtworks, isLoading]);

  // Client-side filtering and sorting for instant responsiveness
  const displayedArtworks = useMemo(() => {
    let list = (localArtworks || []).filter(
      (art) => art.selling_mode === 'BIDDING' || art.pricing_type === 'BIDDING'
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (art) =>
          art.title?.toLowerCase().includes(q) ||
          art.artist?.name?.toLowerCase().includes(q) ||
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
    } else if (activeSort === 'bid_low') {
      list.sort((a, b) => (a.starting_bid ?? 0) - (b.starting_bid ?? 0));
    } else if (activeSort === 'bid_high') {
      list.sort((a, b) => (b.starting_bid ?? 0) - (a.starting_bid ?? 0));
    } else if (activeSort === 'newest') {
      list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return list;
  }, [localArtworks, searchQuery, activeSort, isLoading]);

  // Optimistic Like Handler
  const handleLike = useCallback(
    (artworkId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();

      if (!currentUserId) {
        toast.info('Please sign in to like this artwork', {
          action: {
            label: 'Sign In',
            onClick: () => router.push('/auth/login'),
          },
        });
        return;
      }

      setLocalArtworks((prev) =>
        prev.map((art) => {
          if (art.id === artworkId) {
            const nextLiked = !art.isLiked;
            return {
              ...art,
              isLiked: nextLiked,
              likesCount: nextLiked ? art.likesCount + 1 : Math.max(0, art.likesCount - 1),
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
                likesCount: !prev.isLiked ? prev.likesCount + 1 : Math.max(0, prev.likesCount - 1),
              }
            : null
        );
      }

      toggleLikeMutation.mutate({ artworkId });
    },
    [currentUserId, router, selectedArtwork, toggleLikeMutation]
  );

  // Rating Handler
  const handleRate = useCallback(
    (artworkId: string, stars: number, e?: React.MouseEvent) => {
      e?.stopPropagation();

      if (!currentUserId) {
        toast.info('Please sign in to rate this artwork', {
          action: {
            label: 'Sign In',
            onClick: () => router.push('/auth/login'),
          },
        });
        return;
      }

      setLocalArtworks((prev) =>
        prev.map((art) => {
          if (art.id === artworkId) {
            const currentAvg = art.averageRating;
            const count = art.ratingsCount;
            const hadRating = art.userRating !== null;
            const newCount = hadRating ? count : count + 1;
            const oldUserRating = art.userRating || 0;
            const currentTotal = currentAvg * count;
            const newTotal = hadRating
              ? currentTotal - oldUserRating + stars
              : currentTotal + stars;
            const newAvg = Math.round((newTotal / newCount) * 10) / 10;

            return {
              ...art,
              userRating: stars,
              ratingsCount: newCount,
              averageRating: newAvg,
            };
          }
          return art;
        })
      );

      if (selectedArtwork && selectedArtwork.id === artworkId) {
        setSelectedArtwork((prev) => {
          if (!prev) return null;
          const currentAvg = prev.averageRating;
          const count = prev.ratingsCount;
          const hadRating = prev.userRating !== null;
          const newCount = hadRating ? count : count + 1;
          const oldUserRating = prev.userRating || 0;
          const currentTotal = currentAvg * count;
          const newTotal = hadRating
            ? currentTotal - oldUserRating + stars
            : currentTotal + stars;
          const newAvg = Math.round((newTotal / newCount) * 10) / 10;

          return {
            ...prev,
            userRating: stars,
            ratingsCount: newCount,
            averageRating: newAvg,
          };
        });
      }

      rateArtworkMutation.mutate({ artworkId, rating: stars });
    },
    [currentUserId, router, selectedArtwork, rateArtworkMutation]
  );

  // Admin In-Situ Artwork Deletion
  const handleAdminDelete = async () => {
    if (!deletingArtwork) return;
    setIsDeleting(true);

    try {
      const supabase = createClient();
      const artId = deletingArtwork.id;

      // 1. Log moderation audit record if table exists
      try {
        await supabase.from('moderation_logs').insert({
          target_type: 'artwork',
          target_id: artId,
          action: 'DELETE',
          reason: deleteReason || 'Removed by admin from Live Bidding',
          moderator_id: currentUserId,
        });
      } catch (logErr) {
        console.warn('Moderation log skipped:', logErr);
      }

      // 2. Delete child ratings and likes first
      await Promise.all([
        supabase.from('artwork_ratings').delete().eq('artwork_id', artId),
        supabase.from('artwork_likes').delete().eq('artwork_id', artId),
      ]);

      // 3. Delete artwork record
      const { error } = await supabase.from('artworks').delete().eq('id', artId);

      if (error) {
        const { error: fallbackErr } = await supabase.from('Artwork').delete().eq('id', artId);
        if (fallbackErr) throw error;
      }

      toast.success('Bidding item removed successfully', {
        description: `"${deletingArtwork.title}" has been deleted.`,
      });

      // Optimistic update
      setLocalArtworks((prev) => prev.filter((a) => a.id !== artId));
      if (selectedArtwork?.id === artId) setSelectedArtwork(null);
      setDeletingArtwork(null);
      setDeleteReason('');
      utils.artworks.getAllArtworks.invalidate();
    } catch (err: any) {
      console.error('Failed to delete bidding artwork:', err);
      toast.error('Failed to delete artwork: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Upload Auction Artwork Handler
  const handleUploadArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      toast.error('Please provide a title for the artwork');
      return;
    }

    const startingBidNum = parseFloat(uploadStartingBid);
    if (!uploadStartingBid || isNaN(startingBidNum) || startingBidNum <= 0) {
      toast.error('Please provide a valid starting bid amount (LKR)');
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      let imageUrl = uploadImageUrl.trim();

      // If file uploaded, upload to Supabase storage
      if (uploadFile) {
        const fileExt = uploadFile.name.split('.').pop();
        const fileName = `bidding-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `artworks/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('portfolio')
          .upload(filePath, uploadFile, { cacheControl: '3600', upsert: false });

        if (uploadErr) {
          const publicUrlRes = supabase.storage.from('portfolio').getPublicUrl(filePath);
          imageUrl = publicUrlRes.data.publicUrl;
        } else {
          const { data: publicUrlData } = supabase.storage.from('portfolio').getPublicUrl(filePath);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      if (!imageUrl) {
        imageUrl =
          'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80';
      }

      const effectiveArtistId = currentUserId || 'admin-vividcraft-default-id';
      const randomCode = `#ART-${Math.floor(100 + Math.random() * 900)}`;

      // Insert into artworks table
      const { data: inserted, error: insertErr } = await supabase
        .from('artworks')
        .insert({
          artist_id: effectiveArtistId,
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || null,
          image_url: imageUrl,
          selling_mode: 'BIDDING',
          pricing_type: 'BIDDING',
          starting_bid: startingBidNum,
          price: null,
          art_code: randomCode,
        })
        .select()
        .single();

      if (insertErr) {
        await supabase.from('Artwork').insert({
          artistId: effectiveArtistId,
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || null,
          imageUrl: imageUrl,
          selling_mode: 'BIDDING',
          pricing_type: 'BIDDING',
          starting_bid: startingBidNum,
          art_code: randomCode,
        });
      }

      toast.success('Artwork listed for live bidding!', {
        description: `"${uploadTitle.trim()}" is now live in Bidding with starting bid LKR ${startingBidNum.toLocaleString()} (${randomCode}).`,
      });

      // Reset modal state
      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadImageUrl('');
      setUploadArtistName('');
      setUploadFile(null);
      setUploadStartingBid('');

      // Refresh list
      utils.artworks.getAllArtworks.invalidate();
      refetch();
    } catch (err: any) {
      console.error('Failed to upload bidding artwork:', err);
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  // Helper for WhatsApp inquiry URL
  const getWhatsAppBidUrl = (art: RankedArtwork) => {
    const rawNumber = art.artist.whatsapp_number ? art.artist.whatsapp_number.replace(/[^0-9]/g, '') : '94783813833';
    const artistName = art.artist.name || 'Artist';
    const artId = art.art_code || '#ART-104';
    const bidAmount = Number(art.starting_bid || 0).toLocaleString();
    const text = `Hello! I would like to inquire about Artwork '${art.title}' (ID: ${artId}) by artist ${artistName}. Listed Status: Starting Bid LKR ${bidAmount}.`;
    return `https://wa.me/${rawNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors">
      {/* HERO BANNER SECTION */}
      <div className="relative border-b border-amber-200/50 dark:border-amber-900/30 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 mb-6 backdrop-blur-sm">
            <Gavel className="w-3.5 h-3.5 animate-pulse text-amber-500" />
            <span>Curated Live Art Auctions & Direct WhatsApp Bidding</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-white mb-5">
            Live Art Bidding &{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600">
              Auctions
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
            Discover original masterpieces open for live bidding from verified Sri Lankan creators.
            Place your bid or inquire directly with artists via our instant WhatsApp concierge.
          </p>

          {/* Action Row & Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span>100% Authentic Originals</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Direct WhatsApp Concierge</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
              <Tag className="w-4 h-4 text-blue-500" />
              <span>Transparent Starting Bids</span>
            </div>

            {/* List Artwork For Bidding Button */}
            <Button
              onClick={() => setIsUploadOpen(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-4 py-2 rounded-full gap-2 shadow-md cursor-pointer ml-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>List Artwork for Auction</span>
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* SEARCH AND SORT TOOLBAR */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-8 mb-8 border-b border-slate-200 dark:border-slate-800">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by title, artist, or #ART-ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-10 rounded-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 text-sm focus-visible:ring-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            <Button
              variant={activeSort === 'popular' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSort('popular')}
              className={`rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap ${
                activeSort === 'popular'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5 mr-1 text-amber-400" />
              <span>Popular Auctions</span>
            </Button>

            <Button
              variant={activeSort === 'bid_low' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSort('bid_low')}
              className={`rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap ${
                activeSort === 'bid_low'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
              <span>Bid: Low to High</span>
            </Button>

            <Button
              variant={activeSort === 'bid_high' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSort('bid_high')}
              className={`rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap ${
                activeSort === 'bid_high'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              <span>Bid: High to Low</span>
            </Button>

            <Button
              variant={activeSort === 'newest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSort('newest')}
              className={`rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap ${
                activeSort === 'newest'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span>Newly Listed</span>
            </Button>

            <Button
              variant={activeSort === 'highest_rated' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSort('highest_rated')}
              className={`rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap ${
                activeSort === 'highest_rated'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Star className="w-3.5 h-3.5 mr-1 text-yellow-400 fill-yellow-400" />
              <span>Highest Rated</span>
            </Button>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && localArtworks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Loading live bidding artworks...
            </p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && displayedArtworks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg mx-auto">
            <Gavel className="w-12 h-12 text-amber-500/60 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              No live bidding artworks found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {searchQuery
                ? `No auctions match "${searchQuery}". Try clearing your search.`
                : 'Be the first artist to list an artwork for live bidding and auction!'}
            </p>
            {searchQuery ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="rounded-full"
              >
                Clear Search
              </Button>
            ) : (
              <Button
                onClick={() => setIsUploadOpen(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white rounded-full text-xs font-semibold gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>List an Artwork Now</span>
              </Button>
            )}
          </div>
        )}

        {/* BIDDING ARTWORKS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {displayedArtworks.map((artwork) => {
            const currentHoverRating = hoveredRating[artwork.id] || 0;
            const effectiveUserRating = artwork.userRating || 0;

            return (
              <div
                key={artwork.id}
                className="group relative bg-white dark:bg-[#111827] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* IMAGE CONTAINER */}
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer"
                  onClick={() => setSelectedArtwork(artwork)}
                >
                  <img
                    src={getSafeArtworkUrl(artwork.image_url)}
                    alt={artwork.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_ARTWORK_PLACEHOLDER;
                    }}
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Top Bar on Image: Live Bidding Badge */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    {/* Open Bidding Badge */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-black shadow-lg">
                      <Gavel className="w-3 h-3 text-black" />
                      <span>Open Bidding</span>
                    </div>

                    {/* Admin Moderation Button (In-Situ) */}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingArtwork(artwork);
                        }}
                        className="p-1.5 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white shadow-md transition-all cursor-pointer pointer-events-auto"
                        title="Admin: Remove this bidding item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Zoom/Maximize Button on Hover */}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedArtwork(artwork);
                      }}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors"
                      title="View Details & Full Image"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Starting Bid Badge Over Image */}
                  <div className="absolute bottom-3 left-3 pointer-events-none">
                    <div className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-amber-500/40 text-left">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block leading-tight">
                        Starting Bid
                      </span>
                      <span className="text-sm font-extrabold text-white">
                        LKR {Number(artwork.starting_bid || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD BODY */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Artwork Title */}
                    <h3
                      onClick={() => setSelectedArtwork(artwork)}
                      className="font-bold text-base sm:text-lg text-slate-900 dark:text-white line-clamp-1 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer transition-colors"
                    >
                      {artwork.title}
                    </h3>

                    {/* Real Artist Profile Info & Ref ID */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Link
                        href={`/freelancers/${artwork.artist_id}`}
                        className="flex items-center gap-2.5 group/artist hover:opacity-80 transition-opacity flex-1 min-w-0"
                      >
                        <Avatar className="w-8 h-8 border border-amber-500/30 shrink-0">
                          <AvatarImage
                            src={getProfilePictureUrl(artwork.artist_id, artwork.artist.avatar_url)}
                            alt={artwork.artist.name}
                          />
                          <AvatarFallback className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-xs">
                            {artwork.artist.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 text-left">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover/artist:text-amber-600 dark:group-hover/artist:text-amber-400">
                            {artwork.artist.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {artwork.artist.title || 'Artist / Creator'}
                          </p>
                        </div>
                      </Link>

                      <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500 shrink-0">
                        Ref ID: {artwork.art_code || '#ART-104'}
                      </span>
                    </div>
                  </div>

                  {/* Rating Stars & Interaction */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const filled =
                          currentHoverRating > 0
                            ? star <= currentHoverRating
                            : effectiveUserRating > 0
                            ? star <= effectiveUserRating
                            : star <= Math.round(artwork.averageRating);

                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={(e) => handleRate(artwork.id, star, e)}
                            onMouseEnter={() =>
                              setHoveredRating((prev) => ({ ...prev, [artwork.id]: star }))
                            }
                            onMouseLeave={() =>
                              setHoveredRating((prev) => ({ ...prev, [artwork.id]: 0 }))
                            }
                            className="p-0.5 hover:scale-125 transition-transform cursor-pointer"
                            title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                filled
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-300 dark:text-slate-600'
                              } transition-colors`}
                            />
                          </button>
                        );
                      })}
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">
                        {artwork.averageRating > 0 ? artwork.averageRating.toFixed(1) : '—'}
                      </span>
                    </div>

                    {/* Like Counter Button */}
                    <button
                      onClick={(e) => handleLike(artwork.id, e)}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          artwork.isLiked
                            ? 'text-rose-500 fill-rose-500'
                            : 'text-slate-400 hover:text-rose-500'
                        } transition-colors`}
                      />
                      <span>{artwork.likesCount}</span>
                    </button>
                  </div>

                  {/* ACTION: Ask About Price / Place Bid via WhatsApp */}
                  <div className="mt-4 pt-3">
                    <a
                      href={getWhatsAppBidUrl(artwork)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <Gavel className="w-3.5 h-3.5" />
                      <span>Ask About Price / Place Bid</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAIL LIGHTBOX MODAL */}
      {selectedArtwork && (
        <div
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedArtwork(null)}
        >
          <div
            className="relative bg-white dark:bg-[#111827] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 z-[100000] flex flex-col md:flex-row my-8 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedArtwork(null)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left: Artwork Image */}
            <div className="md:w-3/5 bg-black flex items-center justify-center relative min-h-[300px] md:min-h-[500px]">
              <img
                src={getSafeArtworkUrl(selectedArtwork.image_url)}
                alt={selectedArtwork.title}
                className="max-h-[85vh] w-full object-contain"
              />

              {/* Badges Over Image */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-black shadow-md">
                  <Gavel className="w-3 h-3" />
                  <span>Open Bidding</span>
                </div>
              </div>
            </div>

            {/* Right: Artwork Details & Bidding Panel */}
            <div className="md:w-2/5 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-white dark:bg-[#111827]">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  {selectedArtwork.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-2">
                  Ref ID: <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedArtwork.art_code || '#ART-104'}</span>
                </p>

                {/* Artwork Description */}
                {selectedArtwork.description && (
                  <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-h-28 overflow-y-auto">
                    <span className="font-semibold text-amber-600 dark:text-amber-400 block mb-1 text-[10px] uppercase tracking-wider">
                      Artwork Story &amp; Description
                    </span>
                    <p className="whitespace-pre-line">{selectedArtwork.description}</p>
                  </div>
                )}

                {/* Starting Bid Panel */}
                <div className="my-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/25">
                  <span className="text-xs uppercase font-bold tracking-wider text-amber-700 dark:text-amber-300 block mb-1">
                    Starting Bid Amount
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    LKR {Number(selectedArtwork.starting_bid || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Bids are received and managed directly through our verified artist WhatsApp line.
                  </p>
                </div>

                {/* Real Artist Profile Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 mb-6">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block mb-3">
                    Created By
                  </span>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-amber-500/30">
                      <AvatarImage
                        src={getProfilePictureUrl(selectedArtwork.artist_id, selectedArtwork.artist.avatar_url)}
                        alt={selectedArtwork.artist.name}
                      />
                      <AvatarFallback className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                        {selectedArtwork.artist.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {selectedArtwork.artist.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {selectedArtwork.artist.title || 'Artist / Creator'}
                      </p>
                      {selectedArtwork.artist.location && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {selectedArtwork.artist.location}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedArtwork.artist.bio && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-3 leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-2">
                      {selectedArtwork.artist.bio}
                    </p>
                  )}
                  <div className="mt-3">
                    <Link
                      href={`/freelancers/${selectedArtwork.artist_id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      <span>View Artist Portfolio</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Rating and Likes */}
                <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedArtwork.averageRating > 0 ? selectedArtwork.averageRating.toFixed(1) : 'No ratings yet'}
                    </span>
                    <span className="text-slate-500">({selectedArtwork.ratingsCount} reviews)</span>
                  </div>

                  <button
                    onClick={() => handleLike(selectedArtwork.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        selectedArtwork.isLiked ? 'text-rose-500 fill-rose-500' : ''
                      }`}
                    />
                    <span>{selectedArtwork.likesCount} Likes</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 flex flex-col gap-3">
                <a
                  href={getWhatsAppBidUrl(selectedArtwork)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer"
                >
                  <Gavel className="w-4 h-4" />
                  <span>Ask About Price / Place Bid (WhatsApp)</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN DELETE MODAL */}
      {deletingArtwork && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setDeletingArtwork(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/60">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Remove Bidding Artwork
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                "{deletingArtwork.title}"
              </span>{' '}
              ({deletingArtwork.art_code || '#ART-104'}) from the Live Bidding marketplace?
            </p>

            <div className="mb-5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Moderation Reason (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g., Inappropriate content, copyright dispute, sold out..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingArtwork(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdminDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Removing...</span>
                  </>
                ) : (
                  'Confirm Delete'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD AUCTION ARTWORK MODAL */}
      {isUploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setIsUploadOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Gavel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    List Artwork for Auction
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Open for live bidding in the Bidding gallery
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadArtwork} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Artwork Title *
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Sigiriya Citadel at Sunrise"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Artwork Description (Tell the story behind your creation)
                </label>
                <Textarea
                  placeholder="Share the inspiration, medium, technique, or story behind this piece..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="text-xs min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Starting Bid Amount (LKR) *
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 50000"
                  value={uploadStartingBid}
                  onChange={(e) => setUploadStartingBid(e.target.value)}
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Starting price buyers will see in the live bidding feed.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Artwork Image File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-50 dark:file:bg-amber-950/40 file:text-amber-700 dark:file:text-amber-300 hover:file:bg-amber-100 cursor-pointer"
                />
              </div>

              {/* Commission Fee Notice */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
                Note: A standard platform service fee of 5% to 15% will be applied upon successful sale of this artwork.
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Or Direct Image URL
                </label>
                <Input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={uploadImageUrl}
                  onChange={(e) => setUploadImageUrl(e.target.value)}
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
                <span className="font-bold block mb-1">Automatic Routing:</span>
                This artwork will be assigned a formatted ID (e.g. #ART-104) and will appear exclusively in the Live Bidding page with direct WhatsApp concierge bidding enabled.
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUploading}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      <span>Publishing Auction...</span>
                    </>
                  ) : (
                    'Publish for Bidding'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
