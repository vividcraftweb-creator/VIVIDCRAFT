import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CrewMember, FALLBACK_CREW } from '@/types/crew';

export const dynamic = 'force-dynamic';

export type { CrewMember };
export { FALLBACK_CREW };

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
