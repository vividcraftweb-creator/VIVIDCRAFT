import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const result = await supabase
      .from('advertisements')
      .select('*')
      .order('created_at', { ascending: false });

    if (!result.error && Array.isArray(result.data)) {
      const active = result.data.filter((b: any) => b.is_active !== false);
      const mapped = active.map((item: any) => ({
        ...item,
        link_url: item.target_route || item.link_url || '/gallery',
        target_route: item.target_route || item.link_url || '/gallery',
      }));
      return NextResponse.json({ banners: mapped });
    }
  } catch (e) {
    // Graceful fallback
  }

  // Fallback to internal admin API route
  try {
    const internalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/banners`;
    const res = await fetch(internalUrl, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json?.banners && Array.isArray(json.banners)) {
        const active = json.banners
          .filter((b: any) => b.is_active !== false)
          .map((item: any) => ({
            ...item,
            link_url: item.target_route || item.link_url || '/gallery',
            target_route: item.target_route || item.link_url || '/gallery',
          }));
        return NextResponse.json({ banners: active });
      }
    }
  } catch (e) {}

  return NextResponse.json({ banners: [] });
}
