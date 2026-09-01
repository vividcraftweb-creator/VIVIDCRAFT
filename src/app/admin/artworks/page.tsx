import ArtworksPageClient from './ArtworksPageClient';

export default function AdminArtworksPage() {
  try {
    return <ArtworksPageClient />;
  } catch (error) {
    console.error('Error rendering ArtworksPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Artworks Moderation</h1>
        <p className="text-slate-400">Loading artworks...</p>
      </div>
    );
  }
}
