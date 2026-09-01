'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Trash2, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function ArtworksPageClient() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;
  
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.artworks.getArtworks.useQuery({
    search: search || undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const deleteMutation = trpc.admin.artworks.deleteArtwork.useMutation({
    onSuccess: () => {
      toast.success('Artwork deleted successfully');
      utils.admin.artworks.getArtworks.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete artwork');
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this artwork?')) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ImageIcon className="h-6 w-6 text-purple-400" />
          Listed Artworks
        </h1>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search artworks by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {(data?.items ?? []).map((artwork: any) => (
            <div key={artwork.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group">
              <div className="aspect-square relative">
                <img 
                  src={artwork.imageUrl} 
                  alt={artwork.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(artwork.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white truncate">{artwork.title}</h3>
                <p className="text-sm text-slate-400 truncate">By: {artwork.artist?.email || 'Unknown artist'}</p>
                {artwork.price && <p className="text-sm text-green-400 mt-1">${artwork.price}</p>}
              </div>
            </div>
          ))}
          {(!data?.items || data.items.length === 0) && (
            <div className="col-span-full text-center py-12 text-slate-400">
              No artworks found.
            </div>
          )}
        </div>
      )}

      {data && (data.hasMore || page > 0) && (
        <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/10">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="border-white/10 text-white hover:bg-white/10"
          >
            Previous
          </Button>
          <span className="text-slate-400 text-sm">
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data.total || 0)} of {data.total || 0}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => p + 1)}
            disabled={!data.hasMore}
            className="border-white/10 text-white hover:bg-white/10"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
