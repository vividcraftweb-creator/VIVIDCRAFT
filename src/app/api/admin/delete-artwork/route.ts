import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artworkId, artistId, reason } = body;

    if (!artworkId || typeof artworkId !== 'string') {
      return NextResponse.json({ error: 'artworkId is required' }, { status: 400 });
    }

    const deletionReason = (reason && typeof reason === 'string' && reason.trim())
      ? reason.trim()
      : 'Removed by administrator in accordance with community guidelines.';

    const adminClient = createAdminClient();

    // 1. If artistId is provided, notify the artist about the reasoned removal
    if (artistId && typeof artistId === 'string') {
      try {
        // Attempt insert to 'notifications' table (snake_case schema)
        await adminClient.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: artistId,
          title: 'Artwork Removed by Admin',
          message: deletionReason,
          read: false,
          created_at: new Date().toISOString(),
        });
      } catch (notifErr) {
        console.warn('[delete-artwork] notifications table insert notice:', notifErr);
      }

      try {
        // Attempt insert to 'Notification' table (PascalCase schema)
        await adminClient.from('Notification').insert({
          id: crypto.randomUUID(),
          userId: artistId,
          type: 'SYSTEM',
          title: 'Artwork Removed by Admin',
          message: deletionReason,
          read: false,
          createdAt: new Date().toISOString(),
        });
      } catch (notifErr2) {
        console.warn('[delete-artwork] Notification table insert notice:', notifErr2);
      }
    }

    // 2. Remove related likes and ratings
    try {
      await adminClient.from('artwork_likes').delete().eq('artwork_id', artworkId);
    } catch {}
    try {
      await adminClient.from('artwork_ratings').delete().eq('artwork_id', artworkId);
    } catch {}
    try {
      await adminClient.from('artwork_comments').delete().eq('artwork_id', artworkId);
    } catch {}

    // 3. Delete from 'artworks' table
    const { error: deleteError } = await adminClient
      .from('artworks')
      .delete()
      .eq('id', artworkId);

    if (deleteError) {
      console.warn('[delete-artwork] Error deleting from artworks table:', deleteError.message);
    }

    // 4. Also delete from 'Artwork' table if present
    try {
      await adminClient.from('Artwork').delete().eq('id', artworkId);
    } catch {}

    // Instant cache revalidation across gallery, home, and admin
    try {
      revalidatePath('/gallery', 'page');
      revalidatePath('/admin', 'page');
      revalidatePath('/', 'page');
    } catch (revalErr) {
      console.warn('[delete-artwork] revalidation warning:', revalErr);
    }

    return NextResponse.json({
      success: true,
      artworkId,
      artistId,
      reason: deletionReason,
    });
  } catch (err: any) {
    console.error('[delete-artwork] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
