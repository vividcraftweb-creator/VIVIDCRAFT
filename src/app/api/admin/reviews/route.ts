import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { FALLBACK_REVIEWS, ManualReview } from '@/app/api/reviews/route';

export const dynamic = 'force-dynamic';

let memoryReviews: ManualReview[] = [...FALLBACK_REVIEWS];

// GET all reviews (including inactive)
export async function GET() {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('manual_reviews')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return NextResponse.json({ reviews: data });
    }
  } catch (err) {
    console.warn('Error fetching reviews from DB:', err);
  }

  return NextResponse.json({ reviews: memoryReviews });
}

// POST create review
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { author_name, author_role = 'Verified Collector', avatar_url = '', rating = 5, content, is_active = true, display_order } = body;

    if (!author_name || !content) {
      return NextResponse.json({ error: 'Author Name and Review Content are required' }, { status: 400 });
    }

    const newReview: ManualReview = {
      id: `review-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      author_name: String(author_name).trim(),
      author_role: String(author_role).trim() || 'Verified Collector',
      avatar_url: String(avatar_url).trim(),
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      content: String(content).trim(),
      is_active: Boolean(is_active),
      display_order: Number(display_order ?? (memoryReviews.length + 1)),
      created_at: new Date().toISOString(),
    };

    try {
      const adminClient = createAdminClient();
      const insertPayload = {
        author_name: newReview.author_name,
        author_role: newReview.author_role,
        avatar_url: newReview.avatar_url,
        rating: newReview.rating,
        content: newReview.content,
        is_active: newReview.is_active,
        display_order: newReview.display_order,
      };

      const { data, error } = await adminClient
        .from('manual_reviews')
        .insert([insertPayload])
        .select()
        .single();

      if (!error && data) {
        memoryReviews.unshift(data);
        return NextResponse.json({ review: data, success: true }, { status: 201 });
      }
    } catch (dbErr) {
      console.warn('DB insert failed for review, saving in memory:', dbErr);
    }

    memoryReviews.unshift(newReview);
    return NextResponse.json({ review: newReview, success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create review' }, { status: 500 });
  }
}

// PATCH update review
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, is_active, author_name, author_role, avatar_url, rating, content, display_order } = body;

    if (!id) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    let updatedReview: any = null;

    try {
      const adminClient = createAdminClient();
      const updatePayload: any = {};
      if (typeof is_active === 'boolean') updatePayload.is_active = is_active;
      if (author_name) updatePayload.author_name = String(author_name).trim();
      if (author_role) updatePayload.author_role = String(author_role).trim();
      if (avatar_url !== undefined) updatePayload.avatar_url = String(avatar_url).trim();
      if (rating) updatePayload.rating = Math.min(5, Math.max(1, Number(rating)));
      if (content) updatePayload.content = String(content).trim();
      if (typeof display_order === 'number') updatePayload.display_order = display_order;
      updatePayload.updated_at = new Date().toISOString();

      const { data, error } = await adminClient
        .from('manual_reviews')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        updatedReview = data;
      }
    } catch (e) {
      console.warn('Supabase review update failed:', e);
    }

    const idx = memoryReviews.findIndex((r) => r.id === id);
    if (idx !== -1) {
      memoryReviews[idx] = {
        ...memoryReviews[idx],
        ...(typeof is_active === 'boolean' ? { is_active } : {}),
        ...(author_name ? { author_name } : {}),
        ...(author_role ? { author_role } : {}),
        ...(avatar_url !== undefined ? { avatar_url } : {}),
        ...(rating ? { rating: Math.min(5, Math.max(1, Number(rating))) } : {}),
        ...(content ? { content } : {}),
        ...(typeof display_order === 'number' ? { display_order } : {}),
      };
      if (!updatedReview) updatedReview = memoryReviews[idx];
    }

    return NextResponse.json({ review: updatedReview || { id, ...body }, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update review' }, { status: 500 });
  }
}

// DELETE review
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    try {
      const adminClient = createAdminClient();
      await adminClient.from('manual_reviews').delete().eq('id', id);
    } catch (e) {}

    memoryReviews = memoryReviews.filter((r) => r.id !== id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete review' }, { status: 500 });
  }
}
