'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  X,
  Sparkles,
  Palette,
  Tag,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { RankedArtwork } from '@/types/artwork';

interface GalleryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
  onArtworkUploaded: (newArtwork: RankedArtwork) => void;
}

export default function GalleryUploadModal({
  isOpen,
  onClose,
  currentUserId,
  onArtworkUploaded,
}: GalleryUploadModalProps) {
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
  const [uploadGigTitle, setUploadGigTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setUploadTitle('');
    setUploadDescription('');
    setUploadCategory('');
    setUploadMedium('');
    setUploadTechnique('');
    setUploadTags('');
    setUploadImageUrl('');
    setUploadArtistName('');
    setUploadFile(null);
    setUploadSellingMode('FIXED_PRICE');
    setUploadPrice('');
    setUploadStartingBid('');
    setUploadGigTitle('');
  };

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
          gig_title: uploadGigTitle.trim() || null,
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
            gig_title: uploadGigTitle.trim() || null,
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
            gig_title: uploadGigTitle.trim() || null,
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
          gig_title: uploadGigTitle.trim() || null,
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
            gig_title: uploadGigTitle.trim() || null,
          });

          if (retryAmount.error) {
            console.error('Supabase Insert Error:', retryAmount.error);
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
        badge_title: null,
        gig_title: uploadGigTitle.trim() || null,
        base_rating: null,
        review_count_text: null,
        artist: {
          id: artistId,
          name: uploadArtistName.trim() || 'Cinnamon Gallery Curation',
          avatar_url: null,
          title: 'Curator / Admin',
          role: 'ADMIN',
        },
      };

      if (uploadSellingMode !== 'BIDDING') {
        onArtworkUploaded(newArtwork);
        toast.success('Artwork Published to Gallery!', {
          description: `"${uploadTitle.trim()}" (${artCode}) is now live in the gallery.`,
        });
      } else {
        toast.success('Artwork Published to Bidding!', {
          description: `"${uploadTitle.trim()}" (${artCode}) is now live in the Bidding gallery (/bidding).`,
        });
      }

      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Admin Upload Error:', err);
      toast.error('Upload Failed: ' + (err?.message || 'Check database permissions.'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => !isUploading && onClose()}
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
            onClick={() => !isUploading && onClose()}
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
              onClick={onClose}
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
  );
}
