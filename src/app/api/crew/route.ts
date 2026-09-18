import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CrewMember } from '@/types/crew';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('crew_members')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const mapped = data.map((c: any) => ({
        ...c,
        avatar_url: c.image_url || c.avatar_url || '',
        image_url: c.image_url || c.avatar_url || '',
      }));
      return NextResponse.json({ crew: mapped });
    }
  } catch (e) {
    console.warn('API crew GET error:', e);
  }

  return NextResponse.json({ crew: [] });
}
