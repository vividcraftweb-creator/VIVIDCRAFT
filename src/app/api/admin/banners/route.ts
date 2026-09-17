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

// In-memory fallback list if Supabase table is not yet migrated
let fallbackBanners: BannerRecord[] = [];

export function generateUniqueOfferCode(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `OFFER-${randomNum}`;
}

// GET all banners (for Admin)
export async function GET() {
  try {
    const adminClient = createAdminClient();
    let result = await adminClient
      .from('advertisements')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    // If advertisements relation doesn't exist, try banners table
    if (result.error && (result.error.code === '42P01' || result.error.message?.includes('does not exist'))) {
      result = await adminClient
        .from('banners')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
    }

    // When the table exists, return real live database rows (even if empty)
    if (!result.error && Array.isArray(result.data)) {
      return NextResponse.json({ banners: result.data });
    }

    // Only return fallback list if database is unreachable or unmigrated
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

    // Try inserting into Supabase (both banners and advertisements tables)
    try {
      const adminClient = createAdminClient();
      let insertedData: any = null;

      const { data: bData, error: bErr } = await adminClient
        .from('banners')
        .insert([newBannerRecord])
        .select()
        .single();

      if (!bErr && bData) {
        insertedData = bData;
      }

      const { data: aData, error: aErr } = await adminClient
        .from('advertisements')
        .insert([newBannerRecord])
        .select()
        .single();

      if (!insertedData && !aErr && aData) {
        insertedData = aData;
      }

      if (insertedData) {
        fallbackBanners.unshift(insertedData);
        return NextResponse.json({ banner: insertedData, success: true }, { status: 201 });
      }
    } catch (dbErr) {
      console.warn('Could not insert to Supabase banners/advertisements table, saving to fallback:', dbErr);
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

    // Try updating Supabase tables
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

      const [resBanners, resAds] = await Promise.allSettled([
        adminClient.from('banners').update(updatePayload).eq('id', id).select().single(),
        adminClient.from('advertisements').update(updatePayload).eq('id', id).select().single(),
      ]);

      if (resBanners.status === 'fulfilled' && !resBanners.value.error && resBanners.value.data) {
        updatedRecord = resBanners.value.data;
      } else if (resAds.status === 'fulfilled' && !resAds.value.error && resAds.value.data) {
        updatedRecord = resAds.value.data;
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

    // Explicitly delete from Supabase 'banners' and 'advertisements' tables
    try {
      const adminClient = createAdminClient();
      await Promise.allSettled([
        adminClient.from('banners').delete().eq('id', id),
        adminClient.from('advertisements').delete().eq('id', id),
      ]);
    } catch (e) {
      console.warn('Supabase delete skipped/failed');
    }

    fallbackBanners = fallbackBanners.filter((b) => b.id !== id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete banner' }, { status: 500 });
  }
}
