'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image as ImageIcon, Trash2, Plus, Loader2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function GalleryView() {
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const utils = trpc.useUtils();
  const { data: artworks, isLoading } = trpc.artworks.getMyArtworks.useQuery();

  const createArtwork = trpc.artworks.createArtwork.useMutation({
    onSuccess: () => {
      utils.artworks.getMyArtworks.invalidate();
      toast.success('Artwork added successfully');
      setTitle('');
      setDescription('');
    },
    onError: (error) => {
      toast.error(`Failed to add artwork: ${error.message}`);
    },
  });

  const deleteArtwork = trpc.artworks.deleteArtwork.useMutation({
    onSuccess: () => {
      utils.artworks.getMyArtworks.invalidate();
      toast.success('Artwork removed');
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('artworks')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('artworks')
        .getPublicUrl(filePath);

      createArtwork.mutate({
        title,
        description,
        imageUrl: publicUrl,
      });

    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      // clear input
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
              Artist Gallery
            </h2>
            <p className="text-slate-400 text-sm mt-1">Manage your high-quality artwork portfolio</p>
          </div>
        </div>

        {/* Add new image */}
        <div className="flex flex-col gap-3 mb-8 bg-black/20 p-4 rounded-xl border border-white/10">
          <Input
            placeholder="Artwork Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
          <Input
            placeholder="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
          <div className="flex items-center gap-4 mt-2">
            <Button
              asChild
              disabled={isUploading || createArtwork.isPending || !title.trim()}
              className={`bg-purple-600 hover:bg-purple-700 text-white border-0 ${(!title.trim() || isUploading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <label>
                {isUploading || createArtwork.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UploadCloud className="h-4 w-4 mr-2" />
                )}
                Upload File
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading || createArtwork.isPending || !title.trim()}
                  onChange={handleFileUpload}
                />
              </label>
            </Button>
            <p className="text-xs text-slate-400">Please provide a title before uploading.</p>
          </div>
        </div>

        {/* Gallery Grid */}
        {artworks && artworks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {artworks.map((artwork) => (
              <div 
                key={artwork.id} 
                className="group relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={artwork.imageUrl} 
                  alt={artwork.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/400?text=Invalid+Image';
                  }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                  <h3 className="text-white font-semibold text-center mb-1">{artwork.title}</h3>
                  {artwork.description && <p className="text-white/70 text-sm text-center mb-4 line-clamp-2">{artwork.description}</p>}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveImage(artwork.id)}
                    disabled={deleteArtwork.isPending}
                    className="gap-2 mt-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/5 border-dashed">
            <ImageIcon className="h-12 w-12 text-slate-500 mx-auto mb-4 opacity-50" />
            <p className="text-slate-300 font-medium mb-1">Your gallery is empty</p>
            <p className="text-slate-500 text-sm">Upload your high-quality artworks to showcase them to collectors.</p>
          </div>
        )}
      </div>
    </div>
  );
}
