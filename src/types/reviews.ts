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

export const FALLBACK_REVIEWS: ManualReview[] = [
  {
    id: 'rev-1',
    author_name: 'Lord Arthur Pendelton',
    author_role: 'Private Art Collector, London',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    rating: 5,
    content: 'Vivid Art has completely revolutionized how I discover and acquire rare museum-grade contemporary art. The direct curation and provenance transparency are unmatched anywhere in the market.',
    is_active: true,
    display_order: 1,
  },
  {
    id: 'rev-2',
    author_name: 'Camilla Moreau',
    author_role: 'Chief Architectural Designer, Paris',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    rating: 5,
    content: 'Commissioning large-scale physical and digital artworks for luxury hotel projects used to be a fragmented nightmare. With Vivid Art, the curation crew vetted every piece flawlessly.',
    is_active: true,
    display_order: 2,
  },
  {
    id: 'rev-3',
    author_name: 'Dr. Hiroshi Tanaka',
    author_role: 'Gallery Patron & Investor, Tokyo',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    rating: 5,
    content: 'The auction system and curator-backed valuation guarantees gave our institution the confidence to acquire seminal digital and traditional works from international creators.',
    is_active: true,
    display_order: 3,
  },
  {
    id: 'rev-4',
    author_name: 'Evelyn St. Claire',
    author_role: 'Interior Curator & Critic, New York',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    rating: 5,
    content: 'Exceptional artistic integrity, stunning artist stories, and seamless communication. Vivid Art stands head and shoulders above conventional platforms.',
    is_active: true,
    display_order: 4,
  },
];
