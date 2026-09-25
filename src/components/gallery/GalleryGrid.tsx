import { useState, useEffect, useCallback, useMemo, memo, startTransition } from 'react';
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
  className = 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4',
  emptyMessage = 'No artworks available at this time.',
  onArtworkDeleted,
}: GalleryGridProps) {
  const router = useRouter();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());

  const items = useMemo(() => {
    if (!artworks || artworks.length === 0) return [];
    if (deletedIds.size === 0) return artworks;
    return artworks.filter((a) => !deletedIds.has(a.id));
  }, [artworks, deletedIds]);

  const handleDelete = useCallback((deletedId: string) => {
    setDeletedIds((prev) => new Set(prev).add(deletedId));
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
