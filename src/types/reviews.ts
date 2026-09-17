export interface ManualReview {
  id: string;
  author_name: string;
  author_role: string;
  avatar_url?: string;
  rating: number;
  content: string;
  is_active: boolean;
  display_order?: number;
  created_at?: string;
}
