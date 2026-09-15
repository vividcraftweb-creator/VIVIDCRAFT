'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Heart, Send, Loader2, MessageSquare, LogIn, MapPin, Palette, User, Tag, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/hooks/useAuth';
import { type ArtworkItem } from './ArtworkCard';
import { getSafeArtworkUrl, DEFAULT_ARTWORK_PLACEHOLDER, isValidImageUrl } from '@/lib/image-placeholders';

interface ArtworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  artwork: ArtworkItem;
  artistName?: string;
  likesCount: number;
  isLiked: boolean;
  onToggleLike: (e: React.MouseEvent) => void;
  averageRating?: number;
  ratingsCount?: number;
  userRating?: number | null;
  onRate?: (star: number, e: React.MouseEvent) => void;
}

export function ArtworkModal({
  isOpen,
  onClose,
  artwork,
  artistName,
  likesCount,
  isLiked,
  onToggleLike,
}: ArtworkModalProps) {
  const router = useRouter();
  const { data: session, status } = useAuth();
  const isAuthenticated = status === 'authenticated' && !!session?.session?.user;
  const currentUserId = session?.session?.user?.id;

  const [mounted, setMounted] = useState(false);
  const [commentText, setCommentText] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const utils = trpc.useUtils();

  // Fetch comments for this artwork
  const isArtworkIdValid = typeof artwork?.id === 'string' && artwork.id.trim().length > 0;
  const { data: rawComments, isLoading: isLoadingComments } =
    trpc.artworks.getArtworkComments.useQuery(
      { artworkId: isArtworkIdValid ? artwork.id : '' },
      { enabled: isOpen && isArtworkIdValid, retry: false }
    );

  const comments = Array.isArray(rawComments) ? rawComments : [];

  // Add comment mutation
  const addCommentMutation = trpc.artworks.addArtworkComment.useMutation({
    onSuccess: () => {
      setCommentText('');
      utils.artworks.getArtworkComments.invalidate({ artworkId: artwork.id });
      toast.success('Comment posted successfully!');
      // Scroll to bottom of comments
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: (err) => {
      toast.error(`Failed to post comment: ${err.message}`);
    },
  });

  // Lock body scroll when modal is open and handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please sign in to post comments');
      return;
    }

    const trimmed = commentText.trim();
    if (!trimmed) return;

    addCommentMutation.mutate({
      artworkId: artwork.id,
      comment: trimmed,
    });
  };

  const formatCommentDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[100000] grid grid-cols-1 md:grid-cols-2 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-colors focus:outline-none cursor-pointer"
          aria-label="Close artwork dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* LEFT COLUMN: Modern Framed Artwork Preview with Matte Background */}
        <div className="relative bg-zinc-950 flex items-center justify-center p-6 md:p-8 overflow-hidden min-h-[340px] md:min-h-[580px] h-full">
          {/* Subtle Ambient Glow */}
          <div
            className="absolute inset-0 opacity-20 blur-3xl scale-125 pointer-events-none"
            style={{
              backgroundImage: `url(${getSafeArtworkUrl(artwork.image_url)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Framed Image */}
          <div className="relative z-10 max-h-full max-w-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getSafeArtworkUrl(artwork.image_url)}
              alt={artwork.title || 'Artwork'}
              className="max-h-[480px] w-auto max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-300"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = DEFAULT_ARTWORK_PLACEHOLDER;
              }}
            />
          </div>

          {/* Original Artwork Badge */}
          <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-black/70 backdrop-blur-md text-white/90 border border-white/15 shadow-lg">
              Original Artwork
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Details, Metadata, Comments & WhatsApp Action Button */}
        <div className="flex flex-col h-full max-h-[580px] md:max-h-[640px] bg-white dark:bg-slate-900 overflow-hidden">
          {/* Header Section: Status, Title, Artist, Ref ID, Date, Likes */}
          <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0 bg-white dark:bg-slate-900 overflow-y-auto max-h-[300px]">
            {/* Status Badges & Likes Counter Row */}
            <div className="flex items-center justify-between gap-2 pr-10">
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const pType = String(artwork.pricing_type || (artwork as any).selling_type || artwork.selling_mode || '').toUpperCase().trim();
                  const priceNum = artwork.price !== null && artwork.price !== undefined && !isNaN(Number(artwork.price)) ? Number(artwork.price) : 0;
                  const bidNum = artwork.starting_bid !== null && artwork.starting_bid !== undefined && !isNaN(Number(artwork.starting_bid)) ? Number(artwork.starting_bid) : 0;

                  const displayPrice = artwork.price && priceNum > 0 ? `LKR ${priceNum.toLocaleString()}` : null;
                  const displayBid = artwork.starting_bid && bidNum > 0 ? `Starting Bid: LKR ${bidNum.toLocaleString()}` : null;

                  const isForSale = (pType === 'FIXED_PRICE' || pType === 'FOR_SALE' || pType === 'SALE') && displayPrice !== null;
                  const isBidding = !isForSale && (pType === 'BIDDING' || pType === 'AUCTION' || pType === 'BID') && displayBid !== null;

                  return (
                    <>
                      {isForSale && displayPrice && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                          For Sale
                        </span>
                      )}
                      {isBidding && displayBid && (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-2.5 py-0.5 rounded-full">
                          Open Bidding
                        </span>
                      )}
                      {(!isForSale || !displayPrice) && (!isBidding || !displayBid) && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                          Not For Sale
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Likes Counter */}
              <button
                type="button"
                onClick={onToggleLike}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isLiked
                    ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:text-rose-600 dark:hover:text-rose-400'
                }`}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${
                    isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-current'
                  } transition-transform`}
                />
                <span>{likesCount} Likes</span>
              </button>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {artwork.title}
            </h2>

            {/* Price / Starting Bid Display */}
            {(() => {
              const pType = String(artwork.pricing_type || (artwork as any).selling_type || artwork.selling_mode || '').toUpperCase().trim();
              const priceNum = artwork.price !== null && artwork.price !== undefined && !isNaN(Number(artwork.price)) ? Number(artwork.price) : 0;
              const bidNum = artwork.starting_bid !== null && artwork.starting_bid !== undefined && !isNaN(Number(artwork.starting_bid)) ? Number(artwork.starting_bid) : 0;

              const displayPrice = artwork.price && priceNum > 0 ? `LKR ${priceNum.toLocaleString()}` : null;
              const displayBid = artwork.starting_bid && bidNum > 0 ? `Starting Bid: LKR ${bidNum.toLocaleString()}` : null;

              const isForSale = (pType === 'FIXED_PRICE' || pType === 'FOR_SALE' || pType === 'SALE') && displayPrice !== null;
              const isBidding = !isForSale && (pType === 'BIDDING' || pType === 'AUCTION' || pType === 'BID') && displayBid !== null;

              return (
                <>
                  {isForSale && displayPrice && (
                    <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                      Price: {displayPrice}
                    </p>
                  )}
                  {isBidding && displayBid && (
                    <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                      {displayBid}
                    </p>
                  )}
                  {(!isForSale || !displayPrice) && (!isBidding || !displayBid) && (
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Not For Sale
                    </p>
                  )}
                </>
              );
            })()}

            {/* Artist Link, Ref ID: #ART-XXX, and Date */}
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 flex-wrap pt-0.5">
              {(() => {
                const resolvedArtist =
                  artwork.profiles?.artist_name ||
                  artwork.profiles?.full_name ||
                  artistName ||
                  artwork.artist?.name ||
                  'Artist';
                return (
                  <span>
                    By{' '}
                    <Link
                      href={`/freelancers/${artwork.artist_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      {resolvedArtist}
                    </Link>
                  </span>
                );
              })()}
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="font-mono text-slate-500 dark:text-slate-400">
                Ref ID: <span className="font-semibold text-slate-700 dark:text-slate-200">{artwork.art_code || '#ART-101'}</span>
              </span>
              {artwork.created_at && (
                <>
                  <span className="text-slate-400 dark:text-slate-500">•</span>
                  <span className="text-slate-500 dark:text-slate-400">{new Date(artwork.created_at).toLocaleDateString()}</span>
                </>
              )}
            </div>

            {/* Artwork Description explicitly rendered below Title / Artist */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="font-semibold block mb-1 text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Artwork Story &amp; Description
              </span>
              {artwork.description ? (
                <p className="whitespace-pre-line text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
                  {artwork.description}
                </p>
              ) : (
                <p className="italic text-slate-400 dark:text-slate-500 text-xs">
                  No description provided for this piece.
                </p>
              )}
              {(artwork.category || artwork.medium) && (
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                  {artwork.category && (
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Palette className="w-3 h-3 text-amber-500" />
                      Category: <span className="text-slate-700 dark:text-slate-300 font-semibold">{artwork.category}</span>
                    </span>
                  )}
                  {artwork.medium && (
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Tag className="w-3 h-3 text-amber-500" />
                      Medium: <span className="text-slate-700 dark:text-slate-300 font-semibold">{artwork.medium}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Full Artist Profile Info Section */}
            {(() => {
              const artistProfile = artwork.profiles;
              const artistNameResolved =
                artistProfile?.artist_name ||
                artistProfile?.full_name ||
                artistName ||
                artwork.artist?.name ||
                'Artist';
              const artistBio =
                artistProfile?.bio ||
                artistProfile?.headline ||
                artistProfile?.title ||
                artwork.artist?.bio ||
                artwork.artist?.title ||
                'Creative artist & designer on JobHorizons.';
              const artistLocation =
                artistProfile?.location ||
                artistProfile?.address ||
                artwork.artist?.location ||
                'Sri Lanka';
              const artistCategory =
                artwork.category ||
                artistProfile?.category ||
                (artistProfile?.role ? (artistProfile.role.charAt(0).toUpperCase() + artistProfile.role.slice(1)) : 'Visual Arts');
              const avatar = artistProfile?.avatar_url || artwork.artist?.avatar_url;

              return (
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50/70 to-orange-50/50 dark:from-slate-800/90 dark:to-slate-800/60 border border-amber-200/60 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Artist Profile
                    </span>
                    <Link
                      href={`/freelancers/${artwork.artist_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Full Profile</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="relative h-9 w-9 rounded-full overflow-hidden shrink-0 border border-amber-300 dark:border-amber-500/40 bg-amber-100 dark:bg-amber-950 flex items-center justify-center font-bold text-amber-900 dark:text-amber-200 text-xs">
                      {avatar && isValidImageUrl(avatar) ? (
                        <img
                          src={avatar}
                          alt={artistNameResolved}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{artistNameResolved.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {artistNameResolved}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-snug">
                        {artistBio}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span className="truncate">{artistLocation}</span>
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Palette className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span className="truncate">{artistCategory}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Comments Section (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 min-h-[140px] bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                Comments &amp; Feedback ({comments?.length || 0})
              </h3>
            </div>

            {isLoadingComments ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500 dark:text-amber-400 mb-2" />
                <p className="text-xs">Loading comments...</p>
              </div>
            ) : comments && comments.length > 0 ? (
              <div className="space-y-3 bg-white dark:bg-slate-900">
                {comments.map((c: any) => {
                  const isCurrentUser = currentUserId && c.userId === currentUserId;
                  const initial = (c.userName || 'A').charAt(0).toUpperCase();

                  return (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="relative h-6 w-6 rounded-full overflow-hidden flex-shrink-0">
                            {c.userAvatar && isValidImageUrl(c.userAvatar) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={c.userAvatar}
                                alt={c.userName}
                                className="h-full w-full rounded-full object-cover border border-slate-200 dark:border-slate-700"
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
                              className="h-full w-full rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-[10px] font-bold text-slate-950 uppercase"
                              style={{ display: (c.userAvatar && isValidImageUrl(c.userAvatar)) ? 'none' : 'flex' }}
                            >
                              {initial}
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {c.userName}
                            {isCurrentUser && (
                              <span className="ml-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                                (You)
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400" suppressHydrationWarning>
                          {formatCommentDate(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-8 break-words whitespace-pre-line">
                        {c.comment}
                      </p>
                    </div>
                  );
                })}
                <div ref={commentsEndRef} />
              </div>
            ) : (
              <div className="text-center py-8 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700">
                <MessageSquare className="h-7 w-7 text-slate-400 dark:text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">No comments yet</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Be the first to share your thoughts on this artwork!
                </p>
              </div>
            )}
          </div>

          {/* Bottom Area: WhatsApp Inquiry / Action Button & Comment Input */}
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shrink-0">
            {/* WhatsApp Action Button */}
            {(artwork.selling_mode === 'FIXED_PRICE' || artwork.selling_mode === 'BIDDING') && (
              <a
                href={`https://wa.me/94783813833?text=${encodeURIComponent(
                  artwork.selling_mode === 'BIDDING'
                    ? `Hello! I would like to inquire about Artwork '${artwork.title}' (ID: ${artwork.art_code || '#ART-101'}) by artist ${artistName || 'Artist'}. Listed Status: Starting Bid LKR ${Number(artwork.starting_bid || 0).toLocaleString()}.`
                    : `Hello! I would like to inquire about Artwork '${artwork.title}' (ID: ${artwork.art_code || '#ART-101'}) by artist ${artistName || 'Artist'}. Price: LKR ${Number(artwork.price || 0).toLocaleString()}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all cursor-pointer"
              >
                <span>{artwork.selling_mode === 'BIDDING' ? 'Ask About Price / Place Bid (WhatsApp)' : 'Inquire via WhatsApp'}</span>
              </a>
            )}

            {/* Comment Submission Form */}
            {isAuthenticated ? (
              <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Leave a comment on this piece..."
                  maxLength={1000}
                  disabled={addCommentMutation.isPending}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500/60 transition-colors"
                />
                <button
                  type="submit"
                  disabled={addCommentMutation.isPending || !commentText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer shrink-0"
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Post</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20">
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Sign in to leave a comment on this artwork
                </p>
                <button
                  type="button"
                  onClick={() => {
                    router.push(
                      `/auth/signin?callbackUrl=${encodeURIComponent(
                        typeof window !== 'undefined' ? window.location.href : ''
                      )}`
                    );
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

