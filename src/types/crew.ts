export interface CrewMember {
  id: string;
  name: string;
  position: string;
  avatar_url: string;
  short_bio: string;
  full_story: string;
  is_featured: boolean;
  display_order?: number;
  created_at?: string;
}
