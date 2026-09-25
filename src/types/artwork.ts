export interface ArtworkArtist {
  id: string;
  name: string;
  avatar_url: string | null;
  title?: string;
  role?: string;
  bio?: string | null;
  location?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
}

export interface RankedArtwork {
  id: string;
  artist_id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  medium?: string | null;
  technique?: string | null;
  tags?: string[] | null;
  image_url: string;
  created_at: string;
  likesCount: number;
  ratingsCount: number;
  averageRating: number;
  userRating: number | null;
  isLiked: boolean;
  popularityScore?: number;
  selling_mode?: 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE' | null;
  pricing_type?: 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE' | null;
  price?: number | null;
  starting_bid?: number | null;
  art_code?: string;
  badge_title?: string | null;
  gig_title?: string | null;
  base_rating?: number | null;
  review_count_text?: string | null;
  profiles?: {
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    display_name?: string | null;
    username?: string | null;
    phone?: string | null;
    whatsapp_number?: string | null;
    artist_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
    [key: string]: any;
  } | null;
  user?: {
    phone?: string | null;
    [key: string]: any;
  } | null;
  user_name?: string | null;
  artist: ArtworkArtist;
}
