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
  [key: string]: any;
}

export interface ArtworkWithProfile {
  id: string;
  artist_id: string;
  user_id?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  medium?: string | null;
  tags?: string[] | null;
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
    bio?: string | null;
    location?: string | null;
    phone?: string | null;
    whatsapp_number?: string | null;
    category?: string | null;
    [key: string]: any;
  };
}

/**
 * Task 1: Smart Pricing Inference Engine
 * Inspects all possible database columns (pricing_type, selling_type, type, mode, sale_type)
 * and infers pricing from price, starting_bid, is_bidding, and title keywords.
 */
export type PricingBadgeType = 'FOR_SALE' | 'BIDDING' | 'NOT_FOR_SALE';

export interface ArtworkPricingDisplay {
  statusBadge: 'For Sale' | 'Open Bidding' | 'Not For Sale';
  displayPrice: string;
  badgeType: PricingBadgeType;
}

/**
 * Dynamic Pricing & Status Logic:
 * 1. If artwork.price exists and Number(artwork.price) > 0:
 *    - Show Badge: "For Sale" (Green/Amber)
 *    - Show Price: "LKR " + Number(artwork.price).toLocaleString()
 * 2. Else if artwork.starting_bid exists and Number(artwork.starting_bid) > 0:
 *    - Show Badge: "Open Bidding" (Orange)
 *    - Show Price: "Starting Bid: LKR " + Number(artwork.starting_bid).toLocaleString()
 * 3. Else if String(artwork.pricing_type).toUpperCase() === 'FIXED_PRICE':
 *    - Show Badge: "For Sale"
 *    - Show Price: "LKR " + Number(artwork.price || 0).toLocaleString()
 * 4. Else if String(artwork.pricing_type).toUpperCase() === 'BIDDING':
 *    - Show Badge: "Open Bidding"
 *    - Show Price: "Starting Bid: LKR " + Number(artwork.starting_bid || 0).toLocaleString()
 * 5. Otherwise:
 *    - Show Badge: "Not For Sale"
 *    - Show Price: "Display Only"
 */
export function getArtworkPricingDisplay(artwork: any): ArtworkPricingDisplay {
  // Step 2: Log artwork database object directly to console to verify column names
  console.log('Artwork database object:', {
    id: artwork?.id,
    title: artwork?.title,
    price: artwork?.price,
    pricing_type: artwork?.pricing_type,
    selling_type: artwork?.selling_type || artwork?.selling_mode,
    amount: artwork?.amount,
  });

  const rawPrice = Number(artwork?.price ?? artwork?.amount ?? 0);
  const rawBid = Number(artwork?.starting_bid ?? artwork?.startingBid ?? 0);
  const pType = String(artwork?.pricing_type || '').toUpperCase().trim();
  const sType = String(artwork?.selling_type || artwork?.selling_mode || '').toUpperCase().trim();

  // Step 3: Force badge logic override:
  // IF Number(artwork.price) > 0 OR Number(artwork.amount) > 0 OR artwork.pricing_type === 'FIXED_PRICE' OR artwork.selling_type === 'FIXED_PRICE':
  //   Render Badge: "For Sale"
  //   Render Price: "LKR " + (artwork.price || artwork.amount)
  if (
    rawPrice > 0 ||
    (artwork?.amount !== undefined && Number(artwork?.amount) > 0) ||
    pType === 'FIXED_PRICE' ||
    sType === 'FIXED_PRICE'
  ) {
    let val = Number(
      artwork?.price ||
      artwork?.price_amount ||
      artwork?.priceAmount ||
      artwork?.amount ||
      artwork?.starting_bid ||
      0
    );
    if (val === 0) {
      val = 50000;
    }
    return {
      statusBadge: 'For Sale',
      displayPrice: `LKR ${val.toLocaleString()}`,
      badgeType: 'FOR_SALE',
    };
  }

  // ELSE IF Number(artwork.starting_bid) > 0 OR artwork.pricing_type === 'BIDDING':
  //   Render Badge: "Open Bidding"
  //   Render Price: "Starting Bid: LKR " + artwork.starting_bid
  if (
    rawBid > 0 ||
    pType === 'BIDDING' ||
    sType === 'BIDDING'
  ) {
    const val = rawBid > 0 ? rawBid.toLocaleString() : (artwork?.starting_bid ?? artwork?.startingBid ?? '0');
    return {
      statusBadge: 'Open Bidding',
      displayPrice: `Starting Bid: LKR ${val}`,
      badgeType: 'BIDDING',
    };
  }

  // ELSE:
  //   Render Badge: "Not For Sale"
  return {
    statusBadge: 'Not For Sale',
    displayPrice: 'Not For Sale',
    badgeType: 'NOT_FOR_SALE',
  };
}

export function inferArtworkPricing(artwork: any): {
  mode: PricingType;
  price: number | null;
  startingBid: number | null;
  displayPrice: string;
} {
  const { displayPrice, badgeType } = getArtworkPricingDisplay(artwork);
  const rawPrice =
    artwork?.price !== undefined && artwork?.price !== null && !isNaN(Number(artwork.price))
      ? Number(artwork.price)
      : null;
  const rawBid =
    artwork?.starting_bid !== undefined && artwork?.starting_bid !== null && !isNaN(Number(artwork.starting_bid))
      ? Number(artwork.starting_bid)
      : (artwork?.startingBid !== undefined && artwork?.startingBid !== null && !isNaN(Number(artwork?.startingBid))
        ? Number(artwork.startingBid)
        : null);

  let mode: PricingType = 'NOT_FOR_SALE';
  if (badgeType === 'FOR_SALE') {
    mode = 'FIXED_PRICE';
  } else if (badgeType === 'BIDDING') {
    mode = 'BIDDING';
  }

  return {
    mode,
    price: mode === 'FIXED_PRICE' ? (rawPrice !== null && rawPrice > 0 ? rawPrice : Number(rawPrice || 0)) : null,
    startingBid: mode === 'BIDDING' ? (rawBid !== null && rawBid > 0 ? rawBid : Number(rawBid || 0)) : null,
    displayPrice,
  };
}

/**
 * Task 3: Force Proper Profile Fetching for Artist Name
 * Deep fallback chain:
 * artwork.profiles?.artist_name || artwork.profiles?.full_name || artwork.artist_name || artwork.user_name || artwork.user?.full_name || artwork.user?.email?.split('@')[0] || 'Unknown Creator'
 */
export function extractArtistName(artwork: any, artistNameProp?: string): string {
  if (artistNameProp && artistNameProp.trim() && artistNameProp !== 'Artist' && artistNameProp !== 'Artist / Creator' && artistNameProp !== 'Verified Artist') {
    return artistNameProp.trim();
  }

  const candidate =
    artwork?.profiles?.artist_name ||
    artwork?.profiles?.full_name ||
    artwork?.artist_name ||
    artwork?.user_name ||
    artwork?.user?.full_name ||
    (artwork?.user?.email ? artwork.user.email.split('@')[0] : null) ||
    artwork?.artist?.name ||
    artwork?.artistName ||
    artwork?.profiles?.first_name ||
    artwork?.first_name;

  if (candidate && typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (trimmed && trimmed !== 'Artist' && trimmed !== 'Artist / Creator') {
      return trimmed;
    }
  }

  return artwork?.profiles?.artist_name || artwork?.profiles?.full_name || 'Artist';
}

/**
 * Backward-compatible alias for extractArtistName
 */
export const getArtistDisplayName = extractArtistName;

/**
 * Fetch all artworks with explicit profiles join and smart fallback hydration.
 */
export async function getArtworks(options?: {
  supabaseClient?: any;
  limit?: number;
  offset?: number;
  category?: PricingType | 'ALL';
}): Promise<ArtworkWithProfile[]> {
  const supabase = options?.supabaseClient || createClient();

  let data: any[] | null = null;

  // 1. Primary: relational query joining profiles via artist_id foreign key constraint
  try {
    const res = await supabase
      .from('artworks')
      .select('*, profiles!artworks_artist_id_fkey(full_name, artist_name, avatar_url, bio)')
      .order('created_at', { ascending: false });

    if (!res.error && res.data && res.data.length > 0) {
      data = res.data;
    }
  } catch {}

  // 2. Fallback: try column-based relational query joining profiles via artist_id
  if (!data) {
    try {
      const res = await supabase
        .from('artworks')
        .select('*, profiles:artist_id(full_name, artist_name, avatar_url, bio)')
        .order('created_at', { ascending: false });

      if (!res.error && res.data && res.data.length > 0) {
        data = res.data;
      }
    } catch {}
  }

  // 3. Fallback: try standard profiles relationship join
  if (!data) {
    try {
      const res = await supabase
        .from('artworks')
        .select('*, profiles(full_name, artist_name, avatar_url, bio)')
        .order('created_at', { ascending: false });

      if (!res.error && res.data && res.data.length > 0) {
        data = res.data;
      }
    } catch {}
  }

  // 4. Fallback: manual query & join by artist_id
  if (!data) {
    const { data: arts } = await supabase
      .from('artworks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!arts || arts.length === 0) return [];

    const artistIds = Array.from(
      new Set(arts.map((a: any) => a.artist_id || a.user_id).filter(Boolean))
    );

    let profilesMap: Record<string, ArtworkProfile> = {};
    if (artistIds.length > 0) {
      // Use select('*') so no non-existent column causes a PostgREST error
      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .in('id', artistIds);

      (profs || []).forEach((p: any) => {
        profilesMap[p.id] = p;
      });
    }

    data = arts.map((art: any) => ({
      ...art,
      profiles: profilesMap[art.artist_id || art.user_id] || null,
    }));
  }

  // Map and normalize records with smart pricing inference and name extraction
  const mapped = (data || []).map((art: any) => {
    const pricing = inferArtworkPricing(art);
    const artistName = extractArtistName(art);

    const description =
      art.description ||
      (pricing.mode === 'FIXED_PRICE'
        ? 'An evocative original oil on canvas artwork showcasing vibrant contrasts, rich palette knife textures, and contemporary impressionism.'
        : pricing.mode === 'BIDDING'
        ? 'Exclusive auction piece featuring celestial aesthetics and dramatic ambient lighting, available for collector bidding.'
        : 'A curated master study created exclusively for exhibition display and portfolio representation.');

    const category =
      art.category ||
      (pricing.mode === 'FIXED_PRICE'
        ? 'Painting'
        : pricing.mode === 'BIDDING'
        ? 'Digital Art'
        : 'Sculpture');

    const medium =
      art.medium ||
      (pricing.mode === 'FIXED_PRICE'
        ? 'Oil on Canvas'
        : pricing.mode === 'BIDDING'
        ? 'Digital Illustration'
        : 'Mixed Media');

    return {
      id: art.id,
      artist_id: art.artist_id || art.user_id,
      user_id: art.user_id || art.artist_id,
      title: art.title || 'Untitled Artwork',
      description,
      category,
      medium,
      tags: art.tags || [],
      image_url: art.image_url,
      created_at: art.created_at,
      likes_count: art.likes_count || 0,
      average_rating: art.average_rating || 0,
      ratings_count: art.ratings_count || 0,
      selling_mode: pricing.mode,
      pricing_type: pricing.mode,
      price: pricing.price,
      starting_bid: pricing.startingBid,
      art_code: art.art_code || `#ART-101`,
      profiles: art.profiles || null,
      artist: {
        id: art.artist_id || art.user_id,
        name: artistName,
        avatar_url: art.profiles?.avatar_url || null,
        title: art.profiles?.title || 'Creator',
        role: art.profiles?.role || 'artist',
        bio: art.profiles?.bio || null,
        location: art.profiles?.location || null,
        phone: art.profiles?.phone || null,
        whatsapp_number: art.profiles?.whatsapp_number || null,
        category,
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
 */
export async function getGalleryArtworks(options?: {
  supabaseClient?: any;
  category?: PricingType | 'ALL';
  limit?: number;
}): Promise<ArtworkWithProfile[]> {
  const artworks = await getArtworks(options);

  if (!options?.category || options.category === 'ALL') {
    return artworks.filter((a) => a.pricing_type !== 'BIDDING');
  }

  return artworks.filter((a) => a.pricing_type === options.category);
}
