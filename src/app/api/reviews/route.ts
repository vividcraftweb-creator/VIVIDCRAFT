import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ManualReview } from '@/types/reviews';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('manual_reviews')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return NextResponse.json({ reviews: data });
    }
  } catch (e) {
    console.warn('API reviews GET error:', e);
  }

  return NextResponse.json({ reviews: [] });
}
