'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image as ImageIcon, Trash2, Loader2, UploadCloud, Heart, Star } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function GalleryView() {
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState('');
  
  const utils = trpc.useUtils();
  const { data: artworks, isLoading } = trpc.artworks.getMyArtworks.useQuery();

  const createArtwork = trpc.artworks.createArtwork.useMutation({
    onSuccess: () => {
      utils.artworks.getMyArtworks.invalidate();
      toast.success('Artwork added to portfolio successfully!');
      setTitle('');
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
        imageUrl: publicUrl,
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
      <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-white/5 border border-white/10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <ImageIcon className="h-6 w-6 text-purple-400" />
              Artworks / Gallery Manager
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Upload and manage your portfolio artworks, and monitor client interactions and ratings.
            </p>
          </div>
          <div className="text-sm font-medium px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
            {artworks?.length || 0} {artworks?.length === 1 ? 'Artwork' : 'Artworks'} Total
          </div>
        </div>

        {/* Add new image */}
        <div className="flex flex-col gap-3 mb-8 bg-black/20 p-5 rounded-2xl border border-white/10">
          <label htmlFor="artwork-title" className="text-sm font-medium text-white/90">
            Add New Artwork to Portfolio
          </label>
          <Input
            id="artwork-title"
            name="artwork-title"
            placeholder="Artwork Title (e.g. Neon Horizon, Celestial Dreams)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-11"
          />
          <div className="flex flex-wrap items-center gap-4 mt-1">
            <Button
              asChild
              disabled={isUploading || createArtwork.isPending || !title.trim()}
              className={`bg-purple-600 hover:bg-purple-700 text-white font-medium h-11 px-5 border-0 ${
                !title.trim() || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <label htmlFor="artwork-file">
                {isUploading || createArtwork.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UploadCloud className="h-4 w-4 mr-2" />
                )}
                {isUploading ? 'Uploading to Storage...' : 'Upload Image File'}
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
              Provide an artwork title first, then select an image file (PNG, JPG, WEBP).
            </p>
          </div>
        </div>

        {/* Gallery Grid */}
        {artworks && artworks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {artworks.map((artwork: any) => {
              const imgUrl = artwork.image_url || artwork.imageUrl;
              return (
                <div
                  key={artwork.id}
                  className="group relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 transition-all duration-300 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/10 flex flex-col"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={artwork.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/400?text=Invalid+Image';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveImage(artwork.id)}
                        disabled={deleteArtwork.isPending}
                        className="gap-2 self-end bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 flex flex-col flex-1 justify-between bg-black/20">
                    <h3 className="text-white font-semibold text-base truncate mb-2">
                      {artwork.title}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
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
          <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/5 border-dashed">
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

