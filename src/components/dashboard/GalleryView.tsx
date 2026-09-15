'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Image as ImageIcon, Trash2, Loader2, UploadCloud, Heart, Star } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getSafeArtworkUrl, DEFAULT_ARTWORK_PLACEHOLDER } from '@/lib/image-placeholders';

export default function GalleryView() {
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sellingMode, setSellingMode] = useState<'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE'>('NOT_FOR_SALE');
  const [price, setPrice] = useState('');
  const [startingBid, setStartingBid] = useState('');
  
  const utils = trpc.useUtils();
  const { data: artworks, isLoading } = trpc.artworks.getMyArtworks.useQuery();
  const safeArtworks = Array.isArray(artworks) ? artworks : [];

  const createArtwork = trpc.artworks.createArtwork.useMutation({
    onSuccess: (data) => {
      utils.artworks.getMyArtworks.invalidate();
      const targetDestination = sellingMode === 'BIDDING' ? 'Bidding page (/bidding)' : 'Gallery (/gallery)';
      toast.success('Artwork added successfully!', {
        description: `Your piece is now live in the ${targetDestination}.`,
      });
      setTitle('');
      setDescription('');
      setPrice('');
      setStartingBid('');
      setSellingMode('NOT_FOR_SALE');
    },
    onError: (error) => {
      toast.error(`Failed to add artwork: ${error.message}`);
    },
  });

  const deleteArtwork = trpc.artworks.deleteArtwork.useMutation({
    onSuccess: () => {
      utils.artworks.getMyArtworks.invalidate();
      toast.success('Artwork removed from portfolio');
    },
    onError: (error) => {
      toast.error(`Failed to remove artwork: ${error.message}`);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title.trim()) {
      toast.error('Please enter a title for your artwork before uploading.');
      return;
    }

    if (sellingMode === 'FIXED_PRICE' && (!price || Number(price) <= 0)) {
      toast.error('Please enter a valid price amount in LKR for Fixed Price selling.');
      return;
    }

    if (sellingMode === 'BIDDING' && (!startingBid || Number(startingBid) <= 0)) {
      toast.error('Please enter a valid starting bid amount in LKR for Bidding.');
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('artworks')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'Storage upload error');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('artworks')
        .getPublicUrl(filePath);

      await createArtwork.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        imageUrl: publicUrl,
        sellingMode,
        price: sellingMode === 'FIXED_PRICE' && price ? Number(price) : null,
        startingBid: sellingMode === 'BIDDING' && startingBid ? Number(startingBid) : null,
      });

    } catch (error: any) {
      console.error('Artwork upload failure:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (id: string) => {
    deleteArtwork.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <ImageIcon className="h-6 w-6 text-amber-400" />
              Artworks / Gallery Manager
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Upload and manage your portfolio artworks, and monitor client interactions and ratings.
            </p>
          </div>
          <div className="text-sm font-medium px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
            {safeArtworks.length} {safeArtworks.length === 1 ? 'Artwork' : 'Artworks'} Total
          </div>
        </div>

        {/* Add new image */}
        <div className="flex flex-col gap-4 mb-8 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
          <label htmlFor="artwork-title" className="text-sm font-medium text-white/90">
            Add New Artwork to Portfolio
          </label>
          <Input
            id="artwork-title"
            name="artwork-title"
            placeholder="Artwork Title (e.g. Neon Horizon, Celestial Dreams)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 h-11"
          />

          {/* Description Textarea Field */}
          <div className="space-y-1.5">
            <label htmlFor="artwork-description" className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Artwork Description
            </label>
            <Textarea
              id="artwork-description"
              name="artwork-description"
              placeholder="Artwork Description (Tell the story behind your creation)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 min-h-[90px] text-sm"
            />
          </div>

          {/* Selling Options Configuration */}
          <div className="space-y-3 pt-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Selling Mode & Routing
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSellingMode('NOT_FOR_SALE')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  sellingMode === 'NOT_FOR_SALE'
                    ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-sm ring-1 ring-amber-500/40'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="text-sm font-semibold">Not For Sale</div>
                <div className="text-xs text-slate-400 mt-0.5">Display only in /gallery</div>
              </button>
              <button
                type="button"
                onClick={() => setSellingMode('FIXED_PRICE')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  sellingMode === 'FIXED_PRICE'
                    ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/50'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="text-sm font-semibold text-emerald-400">Fixed Price</div>
                <div className="text-xs text-slate-400 mt-0.5">Appears in /gallery</div>
              </button>
              <button
                type="button"
                onClick={() => setSellingMode('BIDDING')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  sellingMode === 'BIDDING'
                    ? 'bg-amber-600/20 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/50'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="text-sm font-semibold text-amber-400">Open Bidding</div>
                <div className="text-xs text-slate-400 mt-0.5">Exclusively in /bidding</div>
              </button>
            </div>

            {/* Conditional Input for Fixed Price */}
            {sellingMode === 'FIXED_PRICE' && (
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                <label htmlFor="price-amount" className="text-xs font-semibold text-emerald-300 block">
                  Price Amount (LKR) *
                </label>
                <Input
                  id="price-amount"
                  type="number"
                  min="1"
                  placeholder="e.g. 75000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-slate-950 border-emerald-500/40 text-white placeholder:text-slate-500 h-10"
                />
                <p className="text-[11px] text-emerald-400/80">
                  {price && Number(price) > 0 ? `Listed Price: LKR ${Number(price).toLocaleString()}` : 'Enter the purchase price in Sri Lankan Rupees (LKR).'}
                </p>
              </div>
            )}

            {/* Conditional Input for Bidding */}
            {sellingMode === 'BIDDING' && (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1.5">
                <label htmlFor="bid-amount" className="text-xs font-semibold text-amber-300 block">
                  Starting Bid Amount (LKR) *
                </label>
                <Input
                  id="bid-amount"
                  type="number"
                  min="1"
                  placeholder="e.g. 50000"
                  value={startingBid}
                  onChange={(e) => setStartingBid(e.target.value)}
                  className="bg-slate-950 border-amber-500/40 text-white placeholder:text-slate-500 h-10"
                />
                <p className="text-[11px] text-amber-400/80">
                  {startingBid && Number(startingBid) > 0 ? `Starting Bid: LKR ${Number(startingBid).toLocaleString()}` : 'Enter the opening bid amount in Sri Lankan Rupees (LKR).'}
                </p>
              </div>
            )}

            {sellingMode === 'NOT_FOR_SALE' && (
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                Marked as display only. Will appear in public Gallery for portfolio presentation.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5 mt-2">
            <div className="flex flex-wrap items-center gap-4">
              <Button
                asChild
                disabled={isUploading || createArtwork.isPending || !title.trim()}
                className={`bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold h-11 px-5 border-0 shadow-lg shadow-amber-500/20 ${
                  !title.trim() || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <label htmlFor="artwork-file">
                  {isUploading || createArtwork.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UploadCloud className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? 'Uploading to Storage...' : 'Upload Image File & Publish'}
                  <input
                    id="artwork-file"
                    name="artwork-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading || createArtwork.isPending || !title.trim()}
                    onChange={handleFileUpload}
                  />
                </label>
              </Button>
              <p className="text-xs text-slate-400">
                Select an image file (PNG, JPG, WEBP) to publish your artwork.
              </p>
            </div>
            {/* 5% to 15% Commission Notice */}
            <p className="text-xs text-amber-300/90 font-medium flex items-center gap-1.5 pt-1">
              <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300">Notice</span>
              <span>A standard platform service fee of 5% to 15% will be applied upon successful sale of this artwork.</span>
            </p>
          </div>
        </div>

        {/* Gallery Grid */}
        {safeArtworks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {safeArtworks.map((artwork: any) => {
              const imgUrl = artwork.image_url || artwork.imageUrl;
              const mode = artwork.selling_mode || 'NOT_FOR_SALE';
              const artCode = artwork.art_code || '#ART-101';

              return (
                <div
                  key={artwork.id}
                  className="group relative rounded-2xl overflow-hidden bg-slate-950/60 border border-slate-800 transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/10 flex flex-col"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getSafeArtworkUrl(imgUrl)}
                      alt={artwork.title || 'Artwork'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = DEFAULT_ARTWORK_PLACEHOLDER;
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveImage(artwork.id)}
                        disabled={deleteArtwork.isPending}
                        className="gap-2 self-end bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 flex flex-col flex-1 justify-between bg-slate-950/80 gap-3">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-white font-semibold text-base truncate flex-1">
                          {artwork.title}
                        </h3>

                        {/* Status Badges */}
                        {mode === 'FIXED_PRICE' && (
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                            For Sale
                          </span>
                        )}
                        {mode === 'BIDDING' && (
                          <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                            Open Bidding
                          </span>
                        )}
                        {mode === 'NOT_FOR_SALE' && (
                          <span className="text-[11px] font-semibold text-slate-400 bg-slate-500/15 border border-slate-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                            Not For Sale
                          </span>
                        )}
                      </div>

                      {/* Pricing / Bid amount display */}
                      {mode === 'FIXED_PRICE' && artwork.price && (
                        <p className="text-xs font-bold text-emerald-400">
                          Price: LKR {Number(artwork.price).toLocaleString()}
                        </p>
                      )}
                      {mode === 'BIDDING' && artwork.starting_bid && (
                        <p className="text-xs font-bold text-amber-400">
                          Starting Bid: LKR {Number(artwork.starting_bid).toLocaleString()}
                        </p>
                      )}

                      {/* Subtle Metadata: Ref ID */}
                      <p className="text-[11px] font-mono text-slate-400 mt-1">
                        Ref ID: {artCode}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                      <span className="flex items-center gap-1 text-rose-400">
                        <Heart className="h-3.5 w-3.5 fill-rose-500/20" />
                        {artwork.likesCount ?? 0} {artwork.likesCount === 1 ? 'like' : 'likes'}
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star className="h-3.5 w-3.5 fill-amber-500/20" />
                        {artwork.averageRating > 0 ? `${artwork.averageRating}★` : 'Unrated'}
                        {artwork.ratingsCount > 0 && (
                          <span className="text-slate-500">({artwork.ratingsCount})</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-950/40 rounded-2xl border border-slate-800 border-dashed">
            <ImageIcon className="h-12 w-12 text-slate-500 mx-auto mb-4 opacity-50" />
            <p className="text-slate-300 font-medium mb-1">Your gallery is empty</p>
            <p className="text-slate-500 text-sm">
              Upload your high-quality portfolio artworks so clients and collectors can discover, like, and rate them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

