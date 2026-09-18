export interface CrewMember {
  id: string;
  name: string;
  position: string;
  avatar_url?: string;
  image_url?: string;
  short_bio: string;
  full_story: string;
  is_featured: boolean;
  display_order?: number;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  x_url?: string | null;
  created_at?: string;
}
