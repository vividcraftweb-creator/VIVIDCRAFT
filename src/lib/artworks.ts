import { createClient } from '@/lib/supabase/client';

export type PricingType = 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE';

export interface ArtworkProfile {
  id?: string;
  full_name?: string | null;
  artist_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  title?: string | null;
  bio?: string | null;
  location?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
}

export interface ArtworkWithProfile {
  id: string;
  artist_id: string;
  user_id?: string;
  title: string;
  description?: string | null;
  image_url: string;
  created_at: string;
  likes_count?: number;
  average_rating?: number;
  ratings_count?: number;
  selling_mode?: string;
  pricing_type?: string;
  price?: number | null;
  starting_bid?: number | null;
  art_code?: string;
  profiles?: ArtworkProfile | null;
  artist?: {
    id: string;
    name: string;
    avatar_url: string | null;
    title?: string;
    role?: string;
  };
}

/**
 * Helper to get the canonical display name for an artist.
 * Priority: artwork.profiles?.artist_name -> artwork.profiles?.full_name -> 'Verified Artist'.
 * Guarantees never returning generic 'Artist' or 'Artist / Creator' when user data is available.
 */
export function getArtistDisplayName(artwork?: {
  profiles?: ArtworkProfile | null;
  artist?: { name?: string } | null;
  artistName?: string | null;
}): string {
  if (!artwork) return 'Verified Artist';

  const raw =
    artwork.profiles?.artist_name?.trim() ||
    artwork.profiles?.full_name?.trim() ||
    artwork.artistName?.trim() ||
    artwork.artist?.name?.trim();

  if (raw && raw !== 'Artist' && raw !== 'Artist / Creator') {
    return raw;
  }

  return 'Verified Artist';
}

/**
 * Fetch all artworks with explicit profiles join.
 * Executes: .select('*, profiles:user_id(full_name, artist_name, avatar_url, role)')
 * Includes graceful fallback to artist_id relation or manual profile joining.
 */
export async function getArtworks(options?: {
  supabaseClient?: any;
  limit?: number;
  offset?: number;
  category?: PricingType | 'ALL';
}): Promise<ArtworkWithProfile[]> {
  const supabase = options?.supabaseClient || createClient();

  let data: any[] | null = null;

  // 1. Try explicit relational query joining profiles via user_id
  try {
    const res = await supabase
      .from('artworks')
      .select('*, profiles:user_id(full_name, artist_name, avatar_url, role)')
      .order('created_at', { ascending: false });

    if (!res.error && res.data && res.data.length > 0) {
      data = res.data;
    }
  } catch {}

  // 2. Fallback: try relational query joining profiles via artist_id
  if (!data) {
    try {
      const res = await supabase
        .from('artworks')
        .select('*, profiles:artist_id(full_name, artist_name, avatar_url, role)')
        .order('created_at', { ascending: false });

      if (!res.error && res.data && res.data.length > 0) {
        data = res.data;
      }
    } catch {}
  }

  // 3. Fallback: manual query & join
  if (!data) {
    const { data: arts } = await supabase
      .from('artworks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!arts || arts.length === 0) return [];

    const userIds = Array.from(
      new Set(arts.map((a: any) => a.user_id || a.artist_id).filter(Boolean))
    );

    let profilesMap: Record<string, ArtworkProfile> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, artist_name, avatar_url, role')
        .in('id', userIds);

      (profs || []).forEach((p: any) => {
        profilesMap[p.id] = p;
      });
    }

    data = arts.map((art: any) => ({
      ...art,
      profiles: profilesMap[art.user_id || art.artist_id] || null,
    }));
  }

  // Map and normalize records
  const mapped = (data || []).map((art: any) => {
    const pricingType = art.pricing_type || art.selling_mode || 'NOT_FOR_SALE';
    const artistName = getArtistDisplayName(art);

    return {
      id: art.id,
      artist_id: art.artist_id || art.user_id,
      user_id: art.user_id || art.artist_id,
      title: art.title || 'Untitled Artwork',
      description: art.description || null,
      image_url: art.image_url,
      created_at: art.created_at,
      likes_count: art.likes_count || 0,
      average_rating: art.average_rating || 0,
      ratings_count: art.ratings_count || 0,
      selling_mode: pricingType,
      pricing_type: pricingType,
      price: art.price !== undefined && art.price !== null ? Number(art.price) : null,
      starting_bid: art.starting_bid !== undefined && art.starting_bid !== null ? Number(art.starting_bid) : null,
      art_code: art.art_code || `#ART-101`,
      profiles: art.profiles || null,
      artist: {
        id: art.artist_id || art.user_id,
        name: artistName,
        avatar_url: art.profiles?.avatar_url || null,
        title: art.profiles?.title || 'Verified Artist',
        role: art.profiles?.role || 'artist',
      },
    };
  });

  if (options?.category && options.category !== 'ALL') {
    return mapped.filter((a) => a.pricing_type === options.category);
  }

  return mapped;
}

/**
 * Fetch gallery artworks filtered by category tab.
 * Categories: 'ALL' | 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE'
 */
export async function getGalleryArtworks(options?: {
  supabaseClient?: any;
  category?: PricingType | 'ALL';
  limit?: number;
}): Promise<ArtworkWithProfile[]> {
  const artworks = await getArtworks(options);

  if (!options?.category || options.category === 'ALL') {
    // Gallery excludes live bidding from the main curated grid
    return artworks.filter((a) => a.pricing_type !== 'BIDDING');
  }

  return artworks.filter((a) => a.pricing_type === options.category);
}
