'use client';

import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  Tag,
  Palette,
  Sparkles,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export interface UploadArtworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newArtwork: any) => void;
  isAdmin?: boolean;
  currentUserId?: string | null;
}

export function UploadArtworkModal({
  isOpen,
  onClose,
  onSuccess,
  isAdmin = false,
  currentUserId,
}: UploadArtworkModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [medium, setMedium] = useState('');
  const [technique, setTechnique] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [artistName, setArtistName] = useState('');
  const [sellingMode, setSellingMode] = useState<'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE'>('FIXED_PRICE');
  const [price, setPrice] = useState('');
  const [startingBid, setStartingBid] = useState('');
  const [badgeTitle, setBadgeTitle] = useState('Top Rated');
  const [gigTitle, setGigTitle] = useState('');
  const [baseRating, setBaseRating] = useState('4.9');
  const [reviewCountText, setReviewCountText] = useState('(1k+)');
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter an artwork title.');
      return;
    }

    if (!file && !imageUrl.trim()) {
      toast.error('Please select an image file or provide an image URL.');
      return;
    }

    if (sellingMode === 'FIXED_PRICE' && (!price || Number(price) <= 0)) {
      toast.error('Please enter a valid price amount in LKR.');
      return;
    }

    if (sellingMode === 'BIDDING' && (!startingBid || Number(startingBid) <= 0)) {
      toast.error('Please enter a valid starting bid amount in LKR.');
      return;
    }

    // Parse comma-separated inputs
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const parsedMedium = medium.trim();
    const parsedTechnique = technique.trim();
    const parsedCategory = category.trim();

    setIsUploading(true);
    let uploadedFileName: string | null = null;

    try {
      const supabase = createClient();
      let finalImageUrl = imageUrl.trim();

      // If file uploaded, upload to Supabase storage
      if (file) {
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `artwork_${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
        uploadedFileName = fileName;

        const { error: uploadErr } = await supabase.storage
          .from('artworks')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

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

      const priceVal = sellingMode === 'FIXED_PRICE' && price ? Number(price) : null;
      const bidVal = sellingMode === 'BIDDING' && startingBid ? Number(startingBid) : null;

      // Candidate 1: Full insert with medium, technique, tags, category
      const candidate1 = {
        id: newId,
        artist_id: artistId,
        user_id: artistId,
        title: title.trim(),
        description: description.trim() || null,
        category: parsedCategory || null,
        medium: parsedMedium || null,
        technique: parsedTechnique || null,
        tags: parsedTags,
        image_url: finalImageUrl,
        created_at: now,
        selling_mode: sellingMode,
        pricing_type: sellingMode,
        price: priceVal,
        starting_bid: bidVal,
        art_code: artCode,
        badge_title: badgeTitle.trim() || 'Top Rated',
        gig_title: gigTitle.trim() || null,
        base_rating: baseRating ? parseFloat(baseRating) : 4.9,
        review_count_text: reviewCountText.trim() || '(1k+)',
        ...(priceVal && priceVal > 0 ? { amount: priceVal } : {}),
      };

      // Candidate 2: Fallback without technique column if not present in schema cache
      const candidate2 = {
        id: newId,
        artist_id: artistId,
        user_id: artistId,
        title: title.trim(),
        description: description.trim() || null,
        category: parsedCategory || null,
        medium: parsedMedium || null,
        tags: parsedTags,
        image_url: finalImageUrl,
        created_at: now,
        selling_mode: sellingMode,
        pricing_type: sellingMode,
        price: priceVal,
        starting_bid: bidVal,
        art_code: artCode,
        badge_title: badgeTitle.trim() || 'Top Rated',
        gig_title: gigTitle.trim() || null,
        base_rating: baseRating ? parseFloat(baseRating) : 4.9,
        review_count_text: reviewCountText.trim() || '(1k+)',
      };

      // Candidate 3: Basic insert with pricing_type
      const candidate3 = {
        id: newId,
        artist_id: artistId,
        title: title.trim(),
        description: description.trim() || null,
        image_url: finalImageUrl,
        created_at: now,
        pricing_type: sellingMode,
        price: priceVal,
        starting_bid: bidVal,
        badge_title: badgeTitle.trim() || 'Top Rated',
        gig_title: gigTitle.trim() || null,
        base_rating: baseRating ? parseFloat(baseRating) : 4.9,
        review_count_text: reviewCountText.trim() || '(1k+)',
      };

      let insertError: any = null;
      let insertedRow: any = null;

      const candidates = [candidate1, candidate2, candidate3];
      for (const candidate of candidates) {
        const res = await supabase.from('artworks').insert(candidate).select().single();
        if (!res.error) {
          insertedRow = res.data;
          insertError = null;
          break;
        } else {
          insertError = res.error;
          console.warn('Upload candidate insert failed, trying next schema cache fallback:', res.error.message);
        }
      }

      if (insertError) {
        if (uploadedFileName) {
          try {
            await supabase.storage.from('artworks').remove([uploadedFileName]);
          } catch {}
        }
        throw insertError;
      }

      const createdItem = {
        id: newId,
        artist_id: artistId,
        title: title.trim(),
        description: description.trim() || null,
        category: parsedCategory || null,
        medium: parsedMedium || null,
        technique: parsedTechnique || null,
        tags: parsedTags,
        image_url: finalImageUrl,
        created_at: now,
        likesCount: 0,
        ratingsCount: 0,
        averageRating: 0,
        userRating: null,
        isLiked: false,
        popularityScore: 0,
        selling_mode: sellingMode,
        pricing_type: sellingMode,
        price: priceVal,
        starting_bid: bidVal,
        art_code: artCode,
        badge_title: badgeTitle.trim() || 'Top Rated',
        gig_title: gigTitle.trim() || null,
        base_rating: baseRating ? parseFloat(baseRating) : 4.9,
        review_count_text: reviewCountText.trim() || '(1k+)',
        artist: {
          id: artistId,
          name: artistName.trim() || 'Verified Artist',
          avatar_url: null,
          title: isAdmin ? 'Curator / Admin' : 'Verified Artist',
          role: isAdmin ? 'ADMIN' : 'artist',
        },
      };

      toast.success('Artwork Published Successfully!', {
        description: `"${title.trim()}" (${artCode}) is now live with tags and medium configured.`,
      });

      if (onSuccess) {
        onSuccess(createdItem);
      }

      onClose();
    } catch (err: any) {
      console.error('Artwork upload error:', err);
      toast.error('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 overflow-y-auto"
      onClick={() => !isUploading && onClose()}
    >
      <div
        className="relative max-w-lg w-full bg-white dark:bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-950/20 dark:shadow-amber-950/40 space-y-4 my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload New Artwork</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Configure medium, technique, tags, and pricing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isUploading && onClose()}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center cursor-pointer border border-slate-200 dark:border-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <label htmlFor="modal-art-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Artwork Title <span className="text-amber-600 dark:text-amber-400">*</span>
            </label>
            <Input
              id="modal-art-title"
              required
              placeholder="e.g. Whispers of the Highlands, Neon Dreamscape"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm h-10 focus-visible:ring-amber-500"
            />
          </div>

          {/* Service Description / Gig Title */}
          <div className="space-y-1">
            <label htmlFor="modal-gig-title" className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Service Description / Gig Title (Fiverr Marketplace Style)
            </label>
            <Input
              id="modal-gig-title"
              placeholder='e.g. "I will provide professional digital illustrations and portraits"'
              value={gigTitle}
              onChange={(e) => setGigTitle(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs h-9 focus-visible:ring-amber-500"
            />
          </div>

          {/* Gig Badge & Rating Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <div className="space-y-1 sm:col-span-1">
              <label htmlFor="modal-badge-title" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                Gig Badge
              </label>
              <Input
                id="modal-badge-title"
                placeholder='e.g. "Top Rated"'
                value={badgeTitle}
                onChange={(e) => setBadgeTitle(e.target.value)}
                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white h-8 text-xs"
              />
              <div className="flex flex-wrap gap-1 pt-0.5">
                {['Top Rated', 'Level 2', 'Level 1', 'Pro Seller'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBadgeTitle(b)}
                    className={`text-[9px] px-1.5 py-0.5 rounded-md border transition-colors cursor-pointer ${
                      badgeTitle === b
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                        : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 sm:col-span-1">
              <label htmlFor="modal-base-rating" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                Base Rating
              </label>
              <Input
                id="modal-base-rating"
                type="number"
                step="0.1"
                min="1"
                max="5"
                placeholder="4.9"
                value={baseRating}
                onChange={(e) => setBaseRating(e.target.value)}
                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white h-8 text-xs"
              />
            </div>

            <div className="space-y-1 sm:col-span-1">
              <label htmlFor="modal-review-count" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                Reviews Text
              </label>
              <Input
                id="modal-review-count"
                placeholder='e.g. "(1k+)"'
                value={reviewCountText}
                onChange={(e) => setReviewCountText(e.target.value)}
                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white h-8 text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="modal-art-desc" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Artwork Description
            </label>
            <Textarea
              id="modal-art-desc"
              placeholder="Tell the story, creative vision, or emotional depth of this piece..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs min-h-[70px] focus-visible:ring-amber-500"
            />
          </div>

          {/* Category & Medium Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="modal-art-category" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Palette className="w-3 h-3 text-amber-500" />
                Category
              </label>
              <Input
                id="modal-art-category"
                placeholder="e.g. Painting, Digital Art, Sculpture"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="modal-art-medium" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Tag className="w-3 h-3 text-amber-500" />
                Medium
              </label>
              <Input
                id="modal-art-medium"
                placeholder="e.g. Oil on Canvas, Watercolor, Acrylic"
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs h-9"
              />
            </div>
          </div>

          {/* Technique & Tags Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="modal-art-technique" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Technique
              </label>
              <Input
                id="modal-art-technique"
                placeholder="e.g. Impasto, Palette Knife, Wet-on-Wet"
                value={technique}
                onChange={(e) => setTechnique(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="modal-art-tags" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Tag className="w-3 h-3 text-amber-500" />
                Tags (Comma-separated)
              </label>
              <Input
                id="modal-art-tags"
                placeholder="abstract, modern, vibrant, landscape"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs h-9"
              />
            </div>
          </div>

          {/* Artist Attribution (for Admins/Curators) */}
          {isAdmin && (
            <div className="space-y-1">
              <label htmlFor="modal-art-artist" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Artist Attribution
              </label>
              <Input
                id="modal-art-artist"
                placeholder="e.g. Master Artist Name, Vivid Studio"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs h-9"
              />
            </div>
          )}

          {/* Image File Selector & URL */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Artwork Image <span className="text-amber-600 dark:text-amber-400">*</span>
            </label>

            <div className="p-3 border border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-xl text-center bg-slate-50/80 dark:bg-slate-950/60 transition-colors">
              <input
                type="file"
                id="modal-art-file-input"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label
                htmlFor="modal-art-file-input"
                className="flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <ImageIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  {file ? file.name : 'Click to select image file (PNG, JPG, WEBP)'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {file ? `${(file.size / 1024).toFixed(0)} KB selected` : 'or provide image URL below'}
                </span>
              </label>
            </div>

            <Input
              placeholder="https://example.com/artwork.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={!!file}
              className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs h-9 disabled:opacity-50"
            />
          </div>

          {/* Selling Mode Selector */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Selling Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSellingMode('NOT_FOR_SALE')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  sellingMode === 'NOT_FOR_SALE'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/40'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold">Not For Sale</div>
                <div className="text-[10px] text-slate-500">Portfolio only</div>
              </button>
              <button
                type="button"
                onClick={() => setSellingMode('FIXED_PRICE')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  sellingMode === 'FIXED_PRICE'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Fixed Price</div>
                <div className="text-[10px] text-slate-500">Direct buy</div>
              </button>
              <button
                type="button"
                onClick={() => setSellingMode('BIDDING')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  sellingMode === 'BIDDING'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/40'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400">Open Bidding</div>
                <div className="text-[10px] text-slate-500">Live auction</div>
              </button>
            </div>

            {sellingMode === 'FIXED_PRICE' && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                <label htmlFor="modal-price-input" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block">
                  Price Amount (LKR) *
                </label>
                <Input
                  id="modal-price-input"
                  type="number"
                  min="1"
                  placeholder="e.g. 75000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-emerald-500/30 text-slate-900 dark:text-white h-9 text-xs"
                />
              </div>
            )}

            {sellingMode === 'BIDDING' && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                <label htmlFor="modal-bid-input" className="text-xs font-semibold text-amber-700 dark:text-amber-300 block">
                  Starting Bid Amount (LKR) *
                </label>
                <Input
                  id="modal-bid-input"
                  type="number"
                  min="1"
                  placeholder="e.g. 50000"
                  value={startingBid}
                  onChange={(e) => setStartingBid(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-amber-500/30 text-slate-900 dark:text-white h-9 text-xs"
                />
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={onClose}
              className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || (!file && !imageUrl.trim()) || !title.trim()}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-2 cursor-pointer shadow-md"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Publishing...</span>
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
  );
}

export default UploadArtworkModal;
