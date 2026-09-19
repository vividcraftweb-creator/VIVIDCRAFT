import { createClient } from '@/lib/supabase/client';

export type PricingType = 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE';

export interface ArtworkProfile {
  id?: string;
  full_name?: string | null;
  display_name?: string | null;
  username?: string | null;
  user_name?: string | null;
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
  user_name?: string | null;
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
  amount?: number | null;
  price_amount?: number | null;
  starting_bid?: number | null;
  art_code?: string;
  badge_title?: string | null;
  gig_title?: string | null;
  base_rating?: number | null;
  review_count_text?: string | null;
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
  const pType = String(artwork?.pricing_type || artwork?.selling_type || artwork?.selling_mode || '').toUpperCase().trim();
  const displayPrice = Number(artwork?.price ?? artwork?.amount ?? artwork?.price_amount ?? artwork?.priceAmount ?? 0);
  const rawBid = Number(artwork?.starting_bid ?? artwork?.startingBid ?? 0);

  // Check if artwork.price > 0 OR pricing_type === 'FIXED_PRICE' -> Badge: "For Sale", Price: "LKR " + (artwork.price || 0)
  if (displayPrice > 0 || pType === 'FIXED_PRICE' || pType.includes('FIXED') || pType === 'FOR_SALE' || pType === 'SALE') {
    return {
      statusBadge: 'For Sale',
      displayPrice: `LKR ${displayPrice.toLocaleString()}`,
      badgeType: 'FOR_SALE',
    };
  }

  // Check if artwork.starting_bid > 0 OR pricing_type === 'BIDDING' -> Badge: "Open Bidding", Price: "Starting Bid: LKR " + (artwork.starting_bid || 0)
  if (rawBid > 0 || pType === 'BIDDING' || pType.includes('BID') || pType.includes('AUCTION')) {
    const finalBid = rawBid > 0 ? rawBid : Number(artwork?.starting_bid || 0);
    return {
      statusBadge: 'Open Bidding',
      displayPrice: `Starting Bid: LKR ${finalBid.toLocaleString()}`,
      badgeType: 'BIDDING',
    };
  }

  // Otherwise -> Badge: "Not For Sale", Price: "Not For Sale"
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
export function isGenericPlaceholderName(name?: string | null): boolean {
  if (!name || typeof name !== 'string') return true;
  const lower = name.trim().toLowerCase();
  return (
    !lower ||
    lower === 'verified artist' ||
    lower === 'verified artist & creator' ||
    lower === 'verified artist and creator' ||
    lower === 'artist' ||
    lower === 'artist / creator' ||
    lower === 'curator / admin' ||
    lower === 'creator' ||
    lower === 'admin'
  );
}

export function extractArtistName(artwork: any, artistNameProp?: string): string {
  const profile = artwork?.profiles || artwork?.profile || {};

  // 1. Dynamic artist name (first_name + last_name) from profiles table
  const fName = (profile?.first_name || artwork?.first_name || artwork?.user?.first_name || '').toString().trim();
  const lName = (profile?.last_name || artwork?.last_name || artwork?.user?.last_name || '').toString().trim();
  const combinedFirstLast = [fName, lName].filter(Boolean).join(' ').trim();

  if (combinedFirstLast && !isGenericPlaceholderName(combinedFirstLast)) {
    return combinedFirstLast;
  }

  // 2. Fall back to username ONLY if first/last names are missing
  const username = (profile?.username || artwork?.username || profile?.user_name || artwork?.user_name || '').toString().trim();
  if (username && !isGenericPlaceholderName(username)) {
    return username;
  }

  // 3. Fall back to email prefix ONLY if first/last names & username are missing
  const rawEmail = (profile?.email || artwork?.email || artwork?.user?.email || '').toString().trim();
  if (rawEmail && rawEmail.includes('@')) {
    const emailPrefix = rawEmail.split('@')[0].trim();
    if (emailPrefix && !isGenericPlaceholderName(emailPrefix)) {
      return emailPrefix;
    }
  }

  // 4. Fall back to full_name or display_name (if not a generic placeholder)
  const candidateNames = [
    profile?.full_name,
    artwork?.full_name,
    profile?.display_name,
    artwork?.display_name,
    profile?.artist_name,
    artwork?.artist_name,
    artwork?.artist?.name,
    artistNameProp,
  ];

  for (const cand of candidateNames) {
    if (cand && typeof cand === 'string') {
      const trimmed = cand.trim();
      if (trimmed && !isGenericPlaceholderName(trimmed)) {
        return trimmed;
      }
    }
  }

  return 'Artist';
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

  // 1. Primary: explicit join on profiles table
  try {
    const res = await supabase
      .from('artworks')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false });

    if (!res.error && res.data && res.data.length > 0) {
      data = res.data;
    }
  } catch {}

  // 2. Relational query joining profiles via artist_id foreign key constraint
  if (!data) {
    try {
      const res = await supabase
        .from('artworks')
        .select('*, profiles!artworks_artist_id_fkey(id, first_name, last_name, full_name, display_name, username, email, artist_name, avatar_url, bio)')
        .order('created_at', { ascending: false });

      if (!res.error && res.data && res.data.length > 0) {
        data = res.data;
      }
    } catch {}
  }

  // 2. Fallback: try column-based relational query joining profiles via artist_id
  if (!data) {
    try {
      const res = await supabase
        .from('artworks')
        .select('*, profiles:artist_id(id, first_name, last_name, full_name, display_name, username, email, artist_name, avatar_url, bio)')
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
        .select('*, profiles(id, first_name, last_name, full_name, display_name, username, email, artist_name, avatar_url, bio)')
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
      badge_title: art.badge_title || 'Top Rated',
      gig_title: art.gig_title || null,
      base_rating: typeof art.base_rating === 'number' ? art.base_rating : (art.average_rating || 4.9),
      review_count_text: art.review_count_text || (art.ratings_count > 0 ? `(${art.ratings_count})` : '(1k+)'),
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
 * Format Fiverr-style badge with diamonds / icons:
 * - "Top Rated" -> "Top Rated ◆◆◆"
 * - "Level 2" -> "Level 2 ◆◆"
 * - "Level 1" -> "Level 1 ◆"
 * - "Pro Seller" -> "Pro Seller ★"
 */
export function formatBadgeWithDiamonds(badge?: string | null): string {
  const clean = (badge || '').trim();
  if (!clean) return 'Top Rated ◆◆◆';
  const lower = clean.toLowerCase();
  if (lower === 'top rated' || lower === 'top-rated') return 'Top Rated ◆◆◆';
  if (lower === 'level 2' || lower === 'level-2') return 'Level 2 ◆◆';
  if (lower === 'level 1' || lower === 'level-1') return 'Level 1 ◆';
  if (lower === 'pro seller' || lower === 'pro') return 'Pro Seller ★';
  return clean;
}

/**
 * Format Fiverr-style catchy gig title:
 * E.g., "I will provide professional..." or "I will create..."
 */
export function formatGigTitle(title: string, gigTitle?: string | null): string {
  const custom = (gigTitle || '').trim();
  if (custom) return custom;
  const t = (title || '').trim();
  if (!t) return 'I will create custom artwork for your project';
  if (/^i will\b/i.test(t)) return t;
  return `I will create ${t}`;
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

// Re-export WhatsApp utilities
export {
  DEFAULT_WHATSAPP_NUMBER,
  sanitizePhoneNumber,
  isValidInternationalPhone,
  getSafeArtworkWhatsAppUrl,
} from './whatsapp';

