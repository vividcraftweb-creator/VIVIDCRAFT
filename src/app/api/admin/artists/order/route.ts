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
      .select('id, full_name, first_name, last_name, display_name, username, email, avatar_url, role, display_order, show_on_home, title, professional_title, is_verified');

    if (onlyHome) {
      query = query.eq('show_on_home', true);
    } else {
      query = query.or('role.ilike.%artist%,role.ilike.%freelancer%');
    }

    const { data: artists, error } = await query.order('display_order', { ascending: true });

    if (error) {
      // If filtering by show_on_home failed (e.g. column not yet added to remote database), handle gracefully
      if (onlyHome) {
        console.warn('show_on_home query warning:', error.message);
        return NextResponse.json({ artists: [] });
      }
      console.error('Error fetching artists for ordering:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sorted = (artists || []).sort((a: any, b: any) => {
      const orderA = a.display_order ?? 999;
      const orderB = b.display_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      const nameA = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.full_name || a.email || '';
      const nameB = [b.first_name, b.last_name].filter(Boolean).join(' ') || b.full_name || b.email || '';
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
    if (userRole !== 'ADMIN' && user.email !== 'vividcraftweb@gmail.com') {
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
            updatePayload.display_order = isNaN(orderNum) ? 999 : orderNum;
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
      updatePayload.display_order = isNaN(orderNum) ? 999 : orderNum;
    }
    if (show_on_home !== undefined) {
      updatePayload.show_on_home = Boolean(show_on_home);
    }

    const { data: updated, error: updateErr } = await adminClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', artistId)
      .select('id, full_name, first_name, last_name, display_order, show_on_home')
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
