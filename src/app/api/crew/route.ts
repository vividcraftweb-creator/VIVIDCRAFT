import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

export const FALLBACK_CREW: CrewMember[] = [
  {
    id: 'crew-1',
    name: 'Elena Rostova',
    position: 'Lead Fine Art Curator',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    short_bio: 'Curating rare masterpieces with 12+ years of international gallery and exhibition experience.',
    full_story: 'Elena holds a Master in Art History from the Courtauld Institute of Art and spent over a decade curating avant-garde and classical exhibitions across Paris, London, and Tokyo. At Vivid Art, she leads creator vetting, portfolio authenticity verification, and international exhibition curation, connecting collectors with museum-grade physical and digital works.',
    is_featured: true,
    display_order: 1,
  },
  {
    id: 'crew-2',
    name: 'Marcus Vance',
    position: 'Master Painter & Creative Director',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    short_bio: 'Pioneering contemporary oil portraits and mixed-media storytelling across world stages.',
    full_story: 'With solo exhibitions at the Venice Biennale and prestigious New York galleries, Marcus bridges classical oil techniques with modern expressionism. He oversees creative quality, artist mentorship programs, and bespoke private commission workflows at Vivid Art.',
    is_featured: false,
    display_order: 2,
  },
  {
    id: 'crew-3',
    name: 'Amara Chen',
    position: 'Digital Art & 3D Sculpting Lead',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    short_bio: 'Crafting next-gen immersive 3D sculptures, concept art, and high-fidelity generative visual worlds.',
    full_story: 'Amara worked for 8 years as senior visual designer in premier animation and visual effects studios. Her award-winning digital sculptures explore the harmony between biological forms and futuristic architectures. At Vivid Art, she helps digital creators showcase and license high-value 3D creations.',
    is_featured: false,
    display_order: 3,
  },
  {
    id: 'crew-4',
    name: 'David Sterling',
    position: 'Head of Art Auctions & Valuations',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    short_bio: 'Guiding high-stakes art bidding, fair market valuations, and private collector acquisitions.',
    full_story: 'Former senior cataloguer and auctioneer at top European auction houses, David brings deep domain mastery in provenance research, secondary market pricing, and live auction mechanics. He ensures transparency, liquidity, and competitive bidder satisfaction on Vivid Art.',
    is_featured: false,
    display_order: 4,
  },
  {
    id: 'crew-5',
    name: 'Sophia Al-Mansoor',
    position: 'Artist Community Advocate',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    short_bio: 'Empowering independent creators worldwide with resources, visibility, and direct patron links.',
    full_story: 'Sophia is a community builder and visual artist whose grassroots campaigns have supported hundreds of emerging creators across South Asia and the Middle East. She manages our artist community initiatives, fair-pay advisory, and creator residency opportunities.',
    is_featured: false,
    display_order: 5,
  },
];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('crew_members')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return NextResponse.json({ crew: data });
    }
  } catch (e) {
    console.warn('API crew GET error:', e);
  }

  return NextResponse.json({ crew: FALLBACK_CREW });
}
