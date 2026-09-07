'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Heart, Send, Loader2, MessageSquare, LogIn } from 'lucide-react';
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

  const [commentText, setCommentText] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[92vh] flex flex-col lg:flex-row rounded-3xl overflow-hidden glass-card border border-white/20 bg-slate-950/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Mobile/Desktop */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/70 text-white/80 hover:text-white hover:bg-black/90 border border-white/10 transition-colors focus:outline-none"
          aria-label="Close artwork dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* LEFT COLUMN: High-Resolution Artwork Image */}
        <div className="relative lg:w-[58%] w-full h-[320px] sm:h-[400px] lg:h-auto min-h-[300px] bg-black/80 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          {/* Background Ambient Glow */}
          <div
            className="absolute inset-0 opacity-20 blur-3xl scale-125 pointer-events-none"
            style={{
              backgroundImage: `url(${getSafeArtworkUrl(artwork.image_url)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getSafeArtworkUrl(artwork.image_url)}
            alt={artwork.title || 'Artwork'}
            className="relative max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-300"
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = DEFAULT_ARTWORK_PLACEHOLDER;
            }}
          />

          {/* Artwork Watermark / Info Badge */}
          <div className="absolute bottom-4 left-4 pointer-events-none">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/60 backdrop-blur-md text-white/90 border border-white/10">
              Original Artwork
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Details, Stats, and Comments System */}
        <div className="flex-1 flex flex-col h-full max-h-[58vh] lg:max-h-[85vh] border-t lg:border-t-0 lg:border-l border-white/10 bg-black/40">
          {/* Header & Stats */}
          <div className="p-5 sm:p-6 border-b border-white/10 space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {artwork.title}
              </h2>
              {artistName && (
                <p className="text-sm text-purple-300 mt-0.5">
                  Created by <span className="font-semibold text-white">{artistName}</span>
                </p>
              )}
            </div>

            {/* Like & Star Rating Interaction Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {/* Like Button */}
              <button
                type="button"
                onClick={onToggleLike}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isLiked
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-white/5 text-white/70 border border-white/10 hover:bg-rose-500/10 hover:text-rose-300'
                }`}
              >
                <Heart
                  className={`h-4 w-4 ${
                    isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-current'
                  } transition-transform`}
                />
                <span>{likesCount} Likes</span>
              </button>
            </div>
          </div>

          {/* COMMENTS LIST (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
                Comments &amp; Feedback ({comments?.length || 0})
              </h3>
            </div>

            {isLoadingComments ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/50">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400 mb-2" />
                <p className="text-xs">Loading comments...</p>
              </div>
            ) : comments && comments.length > 0 ? (
              <div className="space-y-3.5">
                {comments.map((c: any) => {
                  const isCurrentUser = currentUserId && c.userId === currentUserId;
                  const initial = (c.userName || 'A').charAt(0).toUpperCase();

                  return (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="relative h-6 w-6 rounded-full overflow-hidden flex-shrink-0">
                            {c.userAvatar && isValidImageUrl(c.userAvatar) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={c.userAvatar}
                                alt={c.userName}
                                className="h-full w-full rounded-full object-cover border border-white/10"
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
                              className="h-full w-full rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white uppercase"
                              style={{ display: (c.userAvatar && isValidImageUrl(c.userAvatar)) ? 'none' : 'flex' }}
                            >
                              {initial}
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-white">
                            {c.userName}
                            {isCurrentUser && (
                              <span className="ml-1.5 text-[10px] text-purple-300 font-normal">
                                (You)
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/40" suppressHydrationWarning>
                          {formatCommentDate(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-white/80 leading-relaxed pl-8 break-words whitespace-pre-line">
                        {c.comment}
                      </p>
                    </div>
                  );
                })}
                <div ref={commentsEndRef} />
              </div>
            ) : (
              <div className="text-center py-10 px-4 rounded-2xl bg-white/[0.01] border border-dashed border-white/10">
                <MessageSquare className="h-8 w-8 text-white/20 mx-auto mb-2" />
                <p className="text-xs font-medium text-white/70">No comments yet</p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  Be the first to share your thoughts on this artwork!
                </p>
              </div>
            )}
          </div>

          {/* COMMENT SUBMISSION FOOTER */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-black/60">
            {isAuthenticated ? (
              <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Leave a comment on this piece..."
                  maxLength={1000}
                  disabled={addCommentMutation.isPending}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={addCommentMutation.isPending || !commentText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20"
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Post</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/20 border border-purple-500/20">
                <p className="text-xs text-white/70">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
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
}
