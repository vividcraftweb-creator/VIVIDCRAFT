'use client';

import { useState, useEffect, useCallback, memo, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArtworkCard, type ArtworkItem } from './ArtworkCard';

interface GalleryGridProps {
  artworks: ArtworkItem[];
  artistName?: string;
  className?: string;
  emptyMessage?: string;
  onArtworkDeleted?: (artworkId: string) => void;
}

export function GalleryGridComponent({
  artworks,
  artistName,
  className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
  emptyMessage = 'No artworks available at this time.',
  onArtworkDeleted,
}: GalleryGridProps) {
  const router = useRouter();
  const [items, setItems] = useState<ArtworkItem[]>(artworks || []);

  // Synchronize when incoming artworks prop updates
  useEffect(() => {
    startTransition(() => {
      setItems(artworks || []);
    });
  }, [artworks]);

  const handleDelete = useCallback((deletedId: string) => {
    startTransition(() => {
      setItems((prev) => prev.filter((art) => art.id !== deletedId));
    });
    if (onArtworkDeleted) onArtworkDeleted(deletedId);
    startTransition(() => {
      router.refresh();
    });
  }, [onArtworkDeleted, router]);

  // Instant deletion listener across all users and components
  useEffect(() => {
    const handleArtworkDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      const deletedId = customEvent.detail?.id;
      if (deletedId) {
        handleDelete(deletedId);
      }
    };

    window.addEventListener('artwork-deleted', handleArtworkDeleted);
    return () => window.removeEventListener('artwork-deleted', handleArtworkDeleted);
  }, [handleDelete]);

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {items.map((artwork) => (
        <ArtworkCard
          key={artwork.id}
          artwork={artwork}
          artistName={artistName}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}

export const GalleryGrid = memo(GalleryGridComponent);
export default GalleryGrid;
