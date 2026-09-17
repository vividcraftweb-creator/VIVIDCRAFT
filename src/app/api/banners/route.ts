import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try querying active banners from /api/admin/banners directly or Supabase
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return NextResponse.json({ banners: data });
    }
  } catch (e) {
    // Graceful fallback
  }

  // Fallback to internal API route
  try {
    const internalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/banners`;
    const res = await fetch(internalUrl, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json?.banners) {
        const active = json.banners.filter((b: any) => b.is_active !== false);
        return NextResponse.json({ banners: active });
      }
    }
  } catch (e) {}

  // Built-in curated banners with default offer codes
  return NextResponse.json({
    banners: [
      {
        id: 'banner-gallery',
        badge: 'Curated Masterpieces',
        title: 'Explore Original Fine Art & Portfolios',
        subtitle: 'Discover oil paintings, digital art, sculptures, and mixed media ranked by verified collectors and creators.',
        cta_text: 'Get Offer',
        link_url: '/gallery',
        image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80',
        accent: 'from-amber-500/20 to-orange-500/10',
        offer_code: 'OFFER-7842',
        is_active: true,
      },
      {
        id: 'banner-artists',
        badge: 'Verified Creators',
        title: 'Commission Elite Artists for Custom Works',
        subtitle: 'Connect directly with master painters, illustrators, and visual designers for custom portraits and bespoke commissions.',
        cta_text: 'Get Offer',
        link_url: '/artists',
        image_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1920&q=80',
        accent: 'from-purple-500/20 to-pink-500/10',
        offer_code: 'OFFER-5190',
        is_active: true,
      },
      {
        id: 'banner-bidding',
        badge: 'Live Art Auctions',
        title: 'Exclusive Art Auctions & Open Bidding',
        subtitle: 'Place competitive bids on rare, one-of-a-kind original creations or enter your masterpiece into live auctions.',
        cta_text: 'Get Offer',
        link_url: '/bidding',
        image_url: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=1920&q=80',
        accent: 'from-blue-500/20 to-cyan-500/10',
        offer_code: 'OFFER-3421',
        is_active: true,
      },
      {
        id: 'banner-creator',
        badge: 'Join Vivid Art',
        title: 'Showcase Your Art & Sell to Global Collectors',
        subtitle: 'Join Sri Lanka’s premier digital art marketplace. Create your artist profile, upload artworks, and get discovered.',
        cta_text: 'Get Offer',
        link_url: '/auth/signup',
        image_url: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1920&q=80',
        accent: 'from-emerald-500/20 to-teal-500/10',
        offer_code: 'OFFER-9018',
        is_active: true,
      },
    ],
  });
}
