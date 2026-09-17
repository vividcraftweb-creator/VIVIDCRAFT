import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface BannerRecord {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  cta_text: string;
  link_url: string;
  image_url: string;
  accent?: string;
  offer_code: string;
  is_active: boolean;
  display_order?: number;
  created_at: string;
}

// Global in-memory store as reliable fallback if Supabase table is not yet migrated
let fallbackBanners: BannerRecord[] = [
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
    display_order: 1,
    created_at: new Date('2026-09-01').toISOString(),
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
    display_order: 2,
    created_at: new Date('2026-09-02').toISOString(),
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
    display_order: 3,
    created_at: new Date('2026-09-03').toISOString(),
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
    display_order: 4,
    created_at: new Date('2026-09-04').toISOString(),
  },
];

export function generateUniqueOfferCode(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `OFFER-${randomNum}`;
}

// GET all banners (for Admin)
export async function GET() {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('banners')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return NextResponse.json({ banners: data });
    }

    // Return fallback list
    return NextResponse.json({ banners: fallbackBanners });
  } catch (err: any) {
    console.warn('Fallback: Error querying supabase banners table:', err?.message);
    return NextResponse.json({ banners: fallbackBanners });
  }
}

// POST: Create a new banner / offer
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      subtitle = '',
      badge = 'Special Offer',
      cta_text = 'Get Offer',
      link_url = '/gallery',
      image_url,
      accent = 'from-amber-500/20 to-orange-500/10',
      offer_code,
      is_active = true,
      display_order,
    } = body;

    if (!title || !image_url) {
      return NextResponse.json(
        { error: 'Title and Image URL are required' },
        { status: 400 }
      );
    }

    // Determine Offer Code: user-provided or auto-generated
    let finalOfferCode = (offer_code && String(offer_code).trim().toUpperCase()) || generateUniqueOfferCode();
    if (!finalOfferCode.startsWith('OFFER-') && !finalOfferCode.includes('-')) {
      finalOfferCode = `OFFER-${finalOfferCode}`;
    }

    const newBannerRecord: BannerRecord = {
      id: `banner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      subtitle: subtitle.trim(),
      badge: badge.trim(),
      cta_text: cta_text.trim() || 'Get Offer',
      link_url: link_url.trim() || '/gallery',
      image_url: image_url.trim(),
      accent,
      offer_code: finalOfferCode,
      is_active: Boolean(is_active),
      display_order: Number(display_order ?? (fallbackBanners.length + 1)),
      created_at: new Date().toISOString(),
    };

    // Try inserting into Supabase
    try {
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from('banners')
        .insert([newBannerRecord])
        .select()
        .single();

      if (!error && data) {
        fallbackBanners.unshift(data);
        return NextResponse.json({ banner: data, success: true }, { status: 201 });
      }
    } catch (dbErr) {
      console.warn('Could not insert to Supabase banners table, saving to fallback:', dbErr);
    }

    // Save to local fallback array
    fallbackBanners.unshift(newBannerRecord);
    return NextResponse.json({ banner: newBannerRecord, success: true }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating banner:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create banner' }, { status: 500 });
  }
}

// PATCH: Update banner status or fields
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, is_active, offer_code, title, badge, subtitle, link_url, image_url } = body;

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
    }

    let updatedRecord: any = null;

    // Try updating Supabase
    try {
      const adminClient = createAdminClient();
      const updatePayload: any = {};
      if (typeof is_active === 'boolean') updatePayload.is_active = is_active;
      if (offer_code) updatePayload.offer_code = offer_code.trim().toUpperCase();
      if (title) updatePayload.title = title.trim();
      if (badge) updatePayload.badge = badge.trim();
      if (subtitle !== undefined) updatePayload.subtitle = subtitle.trim();
      if (link_url) updatePayload.link_url = link_url.trim();
      if (image_url) updatePayload.image_url = image_url.trim();
      updatePayload.updated_at = new Date().toISOString();

      const { data, error } = await adminClient
        .from('banners')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        updatedRecord = data;
      }
    } catch (e) {
      console.warn('Supabase update skipped/failed, updating fallback');
    }

    // Update in-memory fallback
    const index = fallbackBanners.findIndex((b) => b.id === id);
    if (index !== -1) {
      fallbackBanners[index] = {
        ...fallbackBanners[index],
        ...(typeof is_active === 'boolean' ? { is_active } : {}),
        ...(offer_code ? { offer_code: offer_code.trim().toUpperCase() } : {}),
        ...(title ? { title: title.trim() } : {}),
        ...(badge ? { badge: badge.trim() } : {}),
        ...(subtitle !== undefined ? { subtitle: subtitle.trim() } : {}),
        ...(link_url ? { link_url: link_url.trim() } : {}),
        ...(image_url ? { image_url: image_url.trim() } : {}),
      };
      if (!updatedRecord) {
        updatedRecord = fallbackBanners[index];
      }
    }

    return NextResponse.json({ banner: updatedRecord || { id, ...body }, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update banner' }, { status: 500 });
  }
}

// DELETE: Remove a banner
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
    }

    // Try deleting from Supabase
    try {
      const adminClient = createAdminClient();
      await adminClient.from('banners').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete skipped/failed');
    }

    fallbackBanners = fallbackBanners.filter((b) => b.id !== id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete banner' }, { status: 500 });
  }
}
