'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Heart, Send, Loader2, MessageSquare, LogIn, MapPin, Palette, User, Tag, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/hooks/useAuth';
import { type ArtworkItem } from './ArtworkCard';
import { getSafeArtworkUrl, DEFAULT_ARTWORK_PLACEHOLDER, isValidImageUrl } from '@/lib/image-placeholders';
import { getArtworkPricingDisplay, isGenericPlaceholderName } from '@/lib/artworks';

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
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[92vh] max-h-[820px] rounded-2xl bg-white dark:bg-[#1E1B18] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col md:grid md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Absolute Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 transition-colors focus:outline-none cursor-pointer shadow-lg"
          aria-label="Close artwork dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* LEFT COLUMN: Modern Framed Artwork Preview */}
        <div className="relative bg-zinc-950 flex items-center justify-center p-4 sm:p-6 overflow-hidden h-[260px] sm:h-[320px] md:h-full w-full shrink-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10">
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
          <div className="relative z-10 w-full h-full flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getSafeArtworkUrl(artwork.image_url)}
              alt={artwork.title || 'Artwork'}
              className="max-h-full max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl transition-transform duration-300 select-none"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = DEFAULT_ARTWORK_PLACEHOLDER;
              }}
            />
          </div>

          {/* Original Artwork Badge */}
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 pointer-events-none">
            <span className="px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-black/70 backdrop-blur-md text-white/90 border border-white/15 shadow-lg">
              Original Artwork
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Details, Metadata, Comments & CTA */}
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#1E1B18] text-slate-900 dark:text-white">
          {/* Scrollable details & comments container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Status Badges & Likes Counter Row */}
            <div className="flex items-center justify-between gap-2 pr-10">
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const { statusBadge, badgeType } = getArtworkPricingDisplay(artwork);
                  return (
                    <>
                      {badgeType === 'FOR_SALE' && (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                          {statusBadge}
                        </span>
                      )}
                      {badgeType === 'BIDDING' && (
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-2.5 py-0.5 rounded-full">
                          {statusBadge}
                        </span>
                      )}
                      {badgeType === 'NOT_FOR_SALE' && (
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                          {statusBadge}
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
              const displayPrice = Number(artwork.price || (artwork as any).amount || (artwork as any).price_amount || 0);
              const { badgeType, displayPrice: fallbackDisplayPrice } = getArtworkPricingDisplay(artwork);
              return (
                <div>
                  {badgeType === 'FOR_SALE' && (
                    <p className="text-lg font-extrabold text-[#A2694E] dark:text-[#C58B6F]">
                      Price: LKR {displayPrice.toLocaleString()}
                    </p>
                  )}
                  {badgeType === 'BIDDING' && (
                    <p className="text-lg font-extrabold text-amber-700 dark:text-amber-400">
                      {fallbackDisplayPrice}
                    </p>
                  )}
                  {badgeType === 'NOT_FOR_SALE' && (
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {fallbackDisplayPrice}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Artist Link, Ref ID: #ART-XXX, and Date */}
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 flex-wrap pt-0.5">
              {(() => {
                const profile = artwork.profiles;
                const firstName = profile?.first_name || artwork.first_name || artwork.artist?.first_name || '';
                const lastName = profile?.last_name || artwork.last_name || artwork.artist?.last_name || '';
                const fullName = profile?.full_name || artwork.artist?.name || '';
                const displayName = `${firstName} ${lastName}`.trim() || fullName || profile?.email || artistName || 'Artist';
                const avatar = profile?.avatar_url || artwork.avatar_url || artwork.artist?.avatar_url;
                const initial = (displayName.trim().charAt(0) || 'A').toUpperCase();
                return (
                  <span className="inline-flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar}
                          alt={displayName}
                          className="w-4 h-4 rounded-full object-cover border border-[#A2694E]/60 shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-[#A2694E]/20 text-[#A2694E] dark:text-[#C58B6F] flex items-center justify-center text-[9px] font-bold shrink-0">
                          {initial}
                        </span>
                      )}
                      By{' '}
                      <Link
                        href={`/freelancers/${artwork.artist_id || artwork.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-[#A2694E] dark:text-[#C58B6F] hover:underline"
                      >
                        {displayName}
                      </Link>
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                      Verified Artist
                    </span>
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

            {/* Full Artist Profile Info Section */}
            {(() => {
              const artistProfile = artwork.profiles;
              const fName = (artistProfile?.first_name || (artwork as any).first_name || artwork.artist?.first_name || '').toString().trim();
              const lName = (artistProfile?.last_name || (artwork as any).last_name || artwork.artist?.last_name || '').toString().trim();
              const combinedModalName = [fName, lName].filter(Boolean).join(' ').trim();
              const artistNameResolved =
                (combinedModalName && !isGenericPlaceholderName(combinedModalName))
                  ? combinedModalName
                  : (artistProfile?.full_name && !isGenericPlaceholderName(artistProfile.full_name))
                  ? artistProfile.full_name
                  : artistName ||
                    artistProfile?.artist_name ||
                    artwork.artist?.name ||
                    'Artist';
              const artistBio =
                artistProfile?.bio ||
                artistProfile?.headline ||
                artistProfile?.title ||
                artwork.artist?.bio ||
                artwork.artist?.title ||
                'Creative artist & designer on Cinnamon Gallery.';
              const artistLocation =
                artistProfile?.location ||
                artistProfile?.address ||
                artwork.artist?.location ||
                'Sri Lanka';
              const artistCategory =
                artwork.category ||
                artistProfile?.category ||
                (artistProfile?.role ? (artistProfile.role.charAt(0).toUpperCase() + artistProfile.role.slice(1)) : 'Visual Arts');
              const avatar = artistProfile?.avatar_url || (artwork as any).avatar_url || artwork.artist?.avatar_url;

              return (
                <div className="p-3.5 rounded-xl bg-[#A2694E]/5 dark:bg-white/5 border border-[#A2694E]/20 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A2694E] dark:text-[#C58B6F] flex items-center gap-1">
                      <User className="w-3 h-3 text-[#8B9B88]" />
                      Artist Profile
                    </span>
                    <Link
                      href={`/freelancers/${artwork.artist_id || artwork.user_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] font-semibold text-[#A2694E] dark:text-[#C58B6F] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Full Profile</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="relative h-9 w-9 rounded-full overflow-hidden shrink-0 border border-[#A2694E]/30 bg-[#A2694E]/15 flex items-center justify-center font-bold text-[#A2694E] dark:text-[#C58B6F] text-xs">
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
                          <MapPin className="w-2.5 h-2.5 text-[#A2694E] shrink-0" />
                          <span className="truncate">{artistLocation}</span>
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Palette className="w-2.5 h-2.5 text-[#A2694E] shrink-0" />
                          <span className="truncate">{artistCategory}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Artwork Story & Description */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
              <span className="font-semibold block text-[10px] uppercase tracking-wider text-[#A2694E] dark:text-[#C58B6F]">
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
              {(artwork.category || artwork.medium || artwork.technique || (artwork.tags && (Array.isArray(artwork.tags) ? artwork.tags.length > 0 : String(artwork.tags).trim().length > 0))) && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 space-y-2">
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                    {artwork.category && (
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Palette className="w-3 h-3 text-[#A2694E]" />
                        Category: <span className="text-slate-700 dark:text-slate-300 font-semibold">{artwork.category}</span>
                      </span>
                    )}
                    {artwork.medium && (
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Tag className="w-3 h-3 text-[#A2694E]" />
                        Medium: <span className="text-slate-700 dark:text-slate-300 font-semibold">{artwork.medium}</span>
                      </span>
                    )}
                    {artwork.technique && (
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Sparkles className="w-3 h-3 text-[#A2694E]" />
                        Technique: <span className="text-slate-700 dark:text-slate-300 font-semibold">{artwork.technique}</span>
                      </span>
                    )}
                  </div>

                  {/* Artwork Tags */}
                  {(() => {
                    const rawTags = artwork.tags;
                    const tagList = Array.isArray(rawTags)
                      ? rawTags
                      : typeof rawTags === 'string'
                      ? rawTags.replace(/[\{\}\"\[\]]/g, '').split(',').map((t: string) => t.trim()).filter(Boolean)
                      : [];
                    if (tagList.length === 0) return null;
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {tagList.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#8B9B88]/15 text-[#8B9B88] border border-[#8B9B88]/30"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-[#A2694E] dark:text-[#C58B6F]" />
                  Comments &amp; Feedback ({comments?.length || 0})
                </h3>
              </div>

              {isLoadingComments ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin text-[#A2694E] mb-2" />
                  <p className="text-xs">Loading comments...</p>
                </div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-2.5">
                  {comments.map((c: any) => {
                    const isCurrentUser = currentUserId && c.userId === currentUserId;
                    const initial = (c.userName || 'A').charAt(0).toUpperCase();

                    return (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1 hover:border-slate-300 dark:hover:border-white/20 transition-colors shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="relative h-6 w-6 rounded-full overflow-hidden flex-shrink-0">
                              {c.userAvatar && isValidImageUrl(c.userAvatar) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={c.userAvatar}
                                  alt={c.userName}
                                  className="h-full w-full rounded-full object-cover border border-slate-200 dark:border-white/10"
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
                                className="h-full w-full rounded-full bg-[#A2694E] flex items-center justify-center text-[10px] font-bold text-white uppercase"
                                style={{ display: (c.userAvatar && isValidImageUrl(c.userAvatar)) ? 'none' : 'flex' }}
                              >
                                {initial}
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                              {c.userName}
                              {isCurrentUser && (
                                <span className="ml-1.5 text-[10px] text-[#A2694E] dark:text-[#C58B6F] font-normal">
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
                <div className="text-center py-6 px-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10">
                  <MessageSquare className="h-6 w-6 text-slate-400 dark:text-slate-600 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">No comments yet</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Be the first to share your thoughts on this artwork!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Area: WhatsApp Inquiry / Action Button & Comment Input */}
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1B18] space-y-3 shrink-0">
            {/* WhatsApp Action Button */}
            {(() => {
              const { badgeType } = getArtworkPricingDisplay(artwork);
              if (badgeType !== 'FOR_SALE' && badgeType !== 'BIDDING') return null;

              const rawPhone = artwork.profiles?.phone || (artwork as any).user?.phone || (artwork as any).artist_phone || '94783813833';
              const cleanPhone = String(rawPhone).replace(/\D/g, '') || '94783813833';

              const title = artwork.title || 'Artwork';
              const rawRef = (artwork as any).ref_id || (artwork as any).art_code || artwork.id || 'N/A';
              const refId = String(rawRef).replace(/^#/, '');
              const modalArtist = artwork.profiles?.full_name || (artwork as any).artist_name || artistName || artwork.artist?.name || 'Artist';

              // Format price safely using existing price fallback values
              const rawPrice = Number(artwork.price || (artwork as any).price_amount || (artwork as any).amount || (artwork as any).starting_bid || 0);
              const priceDisplay = rawPrice > 0 ? `LKR ${rawPrice.toLocaleString()}` : 'Not For Sale / Contact for Price';

              // Build full dynamic message string
              const fullMessage = `Hi, I am interested in buying "${title}" (Ref ID: #${refId}) by ${modalArtist}. Listed Price: ${priceDisplay}.`;
              const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMessage)}`;

              return (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#A2694E] hover:bg-[#8B5A3C] text-white shadow-md shadow-[#A2694E]/20 transition-all cursor-pointer"
                >
                  Ask Price (WhatsApp)
                </a>
              );
            })()}

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
                  className="flex-1 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#A2694E] transition-colors"
                />
                <button
                  type="submit"
                  disabled={addCommentMutation.isPending || !commentText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-[#A2694E] hover:bg-[#8B5A3C] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md shadow-[#A2694E]/20 cursor-pointer shrink-0"
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 text-white" />
                      <span className="hidden sm:inline">Post</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#A2694E]/5 dark:bg-[#A2694E]/10 border border-[#A2694E]/20 dark:border-[#A2694E]/25">
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
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#A2694E] hover:bg-[#8B5A3C] text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm shadow-[#A2694E]/20"
                >
                  <LogIn className="h-3.5 w-3.5 text-white" />
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

