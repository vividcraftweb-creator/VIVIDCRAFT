import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyHome = searchParams.get('home') === 'true';

    const adminClient = createAdminClient();
    let query = adminClient
      .from('profiles')
      .select('id, first_name, last_name, email, role, avatar_url, banner_url, display_order, show_on_home');

    if (onlyHome) {
      // Users where role = 'artist' (or is_artist = true) AND show_on_home = true, excluding client and admin
      query = query
        .eq('show_on_home', true)
        .or('role.eq.artist,role.eq.ARTIST,is_artist.eq.true')
        .neq('role', 'client')
        .neq('role', 'CLIENT')
        .neq('role', 'admin')
        .neq('role', 'ADMIN');
    } else {
      // Filter profiles where role = 'artist' or is_artist = true, excluding client and admin
      query = query
        .or('role.eq.artist,role.eq.ARTIST,is_artist.eq.true')
        .neq('role', 'client')
        .neq('role', 'CLIENT')
        .neq('role', 'admin')
        .neq('role', 'ADMIN');
    }

    let { data: artists, error } = await query.order('display_order', { ascending: true });

    // Fallback if is_artist column does not exist on remote database yet
    if (error) {
      console.warn('Primary artist query notice (falling back):', error.message);
      let fallbackQuery = adminClient
        .from('profiles')
        .select('id, first_name, last_name, email, role, avatar_url, banner_url, display_order, show_on_home')
        .neq('role', 'client')
        .neq('role', 'CLIENT')
        .neq('role', 'admin')
        .neq('role', 'ADMIN');

      if (onlyHome) {
        fallbackQuery = fallbackQuery
          .eq('show_on_home', true)
          .or('role.eq.artist,role.eq.ARTIST,role.ilike.%artist%');
      } else {
        fallbackQuery = fallbackQuery
          .or('role.eq.artist,role.eq.ARTIST,role.ilike.%artist%');
      }

      const fallbackRes = await fallbackQuery.order('display_order', { ascending: true });
      if (!fallbackRes.error && fallbackRes.data) {
        artists = fallbackRes.data;
        error = null;
      }
    }

    if (error) {
      // If filtering by show_on_home failed (e.g. column not yet added to remote database), handle gracefully
      if (onlyHome) {
        console.warn('show_on_home query warning:', error.message);
        return NextResponse.json({ artists: [] });
      }
      console.error('Error fetching artists for ordering:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Strict safety filter: exclude client and admin, ensure artist role
    const filtered = (artists || []).filter((p: any) => {
      const role = (p.role || '').toLowerCase();
      const isArtist = Boolean(p.is_artist);
      if (role === 'client' || role === 'admin') return false;
      return role === 'artist' || isArtist || role.includes('artist');
    });

    const formatted = filtered.map((p: any) => ({
      id: p.id,
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      email: p.email || '',
      role: p.role || 'artist',
      avatar_url: p.avatar_url || '',
      banner_url: p.banner_url || '',
      display_order: typeof p.display_order === 'number' ? p.display_order : 0,
      show_on_home: p.show_on_home !== undefined && p.show_on_home !== null ? Boolean(p.show_on_home) : true,
    }));

    const sorted = formatted.sort((a: any, b: any) => {
      const orderA = a.display_order ?? 0;
      const orderB = b.display_order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      const nameA = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email || '';
      const nameB = [b.first_name, b.last_name].filter(Boolean).join(' ') || b.email || '';
      return nameA.localeCompare(nameB);
    });

    return NextResponse.json({ artists: sorted });
  } catch (err: any) {
    console.error('Error in GET /api/admin/artists/order:', err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Verify user authentication
    let user: any = null;
    try {
      const userClient = await createClient();
      const { data } = await userClient.auth.getUser();
      user = data?.user || null;
    } catch {}

    if (!user) {
      try {
        user = await getUser();
      } catch {}
    }

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Check if user is admin
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const userRole = (profile?.role || user.role || user.user_metadata?.role || '').toUpperCase();
    const userEmail = (user.email || '').toLowerCase().trim();
    if (userRole !== 'ADMIN' && userEmail !== 'vividcraftweb@gmail.com' && userEmail !== 'cinnamongallerysocial@gmail.com') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { artistId, display_order, show_on_home, orders } = body;

    // Batch update support: { orders: [{ id: string, display_order?: number, show_on_home?: boolean }] }
    if (Array.isArray(orders) && orders.length > 0) {
      for (const item of orders) {
        if (item.id) {
          const updatePayload: any = {};
          if (item.display_order !== undefined) {
            const orderNum = parseInt(item.display_order, 10);
            updatePayload.display_order = isNaN(orderNum) ? 0 : orderNum;
          }
          if (item.show_on_home !== undefined) {
            updatePayload.show_on_home = Boolean(item.show_on_home);
          }
          if (Object.keys(updatePayload).length > 0) {
            await adminClient
              .from('profiles')
              .update(updatePayload)
              .eq('id', item.id);
          }
        }
      }
      return NextResponse.json({ success: true, message: 'Artist showcase settings updated successfully' });
    }

    // Single update support: { artistId: string, display_order?: number, show_on_home?: boolean }
    if (!artistId) {
      return NextResponse.json({ error: 'artistId is required' }, { status: 400 });
    }

    const updatePayload: any = {};
    if (display_order !== undefined) {
      const orderNum = parseInt(display_order, 10);
      updatePayload.display_order = isNaN(orderNum) ? 0 : orderNum;
    }
    if (show_on_home !== undefined) {
      updatePayload.show_on_home = Boolean(show_on_home);
    }

    const { data: updated, error: updateErr } = await adminClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', artistId)
      .select('id, first_name, last_name, email, role, avatar_url, banner_url, display_order, show_on_home')
      .single();

    if (updateErr) {
      console.error('Failed to update artist profile:', updateErr);
      return NextResponse.json({ error: 'Database update failed', details: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, artist: updated });
  } catch (err: any) {
    console.error('Error updating artist display order:', err);
    return NextResponse.json({ error: 'Internal server error', details: err?.message }, { status: 500 });
  }
}
