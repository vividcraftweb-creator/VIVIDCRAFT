import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminClient = createAdminClient();
    const { data: artists, error } = await adminClient
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, display_order')
      .or('role.ilike.%artist%,role.ilike.%freelancer%')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching artists for ordering:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sorted = (artists || []).sort((a: any, b: any) => {
      const orderA = a.display_order ?? 999;
      const orderB = b.display_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '');
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
    const { artistId, display_order, orders } = body;

    // Batch update support: { orders: [{ id: string, display_order: number }] }
    if (Array.isArray(orders) && orders.length > 0) {
      for (const item of orders) {
        if (item.id !== undefined && item.display_order !== undefined) {
          const orderNum = parseInt(item.display_order, 10);
          await adminClient
            .from('profiles')
            .update({ display_order: isNaN(orderNum) ? 999 : orderNum })
            .eq('id', item.id);
        }
      }
      return NextResponse.json({ success: true, message: 'Artist display orders updated successfully' });
    }

    // Single update support: { artistId: string, display_order: number }
    if (!artistId) {
      return NextResponse.json({ error: 'artistId is required' }, { status: 400 });
    }

    const orderNum = parseInt(display_order, 10);
    const validOrder = isNaN(orderNum) ? 999 : orderNum;

    const { data: updated, error: updateErr } = await adminClient
      .from('profiles')
      .update({ display_order: validOrder })
      .eq('id', artistId)
      .select('id, full_name, display_order')
      .single();

    if (updateErr) {
      console.error('Failed to update display_order:', updateErr);
      return NextResponse.json({ error: 'Database update failed', details: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, artist: updated });
  } catch (err: any) {
    console.error('Error updating artist display order:', err);
    return NextResponse.json({ error: 'Internal server error', details: err?.message }, { status: 500 });
  }
}
