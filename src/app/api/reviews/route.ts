import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
    id: 'review-1',
    author_name: 'Julian Thorne',
    author_role: 'Private Art Collector, London',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
    rating: 5,
    content: 'Commissioning a bespoke canvas through Vivid Art was an extraordinary experience. The curated artists are genuine masters, and the direct communication made the creative journey unforgettable.',
    is_active: true,
    display_order: 1,
  },
  {
    id: 'review-2',
    author_name: 'Camilla DuPont',
    author_role: 'Interior Architect & Designer',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    rating: 5,
    content: 'We sourced six signature mixed-media pieces for our luxury penthouse project in Geneva. The art valuation and authentication handled by the Vivid Art team was impeccably professional.',
    is_active: true,
    display_order: 2,
  },
  {
    id: 'review-3',
    author_name: 'Alexander Ross',
    author_role: 'Contemporary Art Gallerist',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    rating: 5,
    content: 'The caliber of talent on this platform is unmatched. From live auctions to custom portraits, Vivid Art has created the most seamless bridge between collectors and world-class visionaries.',
    is_active: true,
    display_order: 3,
  },
  {
    id: 'review-4',
    author_name: 'Dr. Maya Senaratne',
    author_role: 'Museum Benefactor & Patron',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    rating: 5,
    content: 'The transparency, verified artist profiles, and personalized guidance from Elena and the curation crew gave us absolute confidence in expanding our permanent foundation collection.',
    is_active: true,
    display_order: 4,
  },
];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('manual_reviews')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return NextResponse.json({ reviews: data });
    }
  } catch (e) {
    console.warn('API reviews GET error:', e);
  }

  return NextResponse.json({ reviews: FALLBACK_REVIEWS });
}
