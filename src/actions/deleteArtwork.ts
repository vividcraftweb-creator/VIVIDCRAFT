'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export interface DeleteArtworkResult {
  success: boolean;
  artworkId?: string;
  error?: string;
}

export async function deleteArtwork(artworkId: string, reason?: string): Promise<DeleteArtworkResult> {
  if (!artworkId || typeof artworkId !== 'string') {
    return { success: false, error: 'Artwork ID is required' };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized: You must be signed in to delete an artwork.' };
    }

    const currentUserId = user.id;
    const metaRole = (user.user_metadata?.role || '').toString().toUpperCase();
    const isAdmin = metaRole === 'ADMIN' || user.email === 'vividcraftweb@gmail.com';

    // Verify ownership or admin privileges
    const { data: artwork } = await supabase
      .from('artworks')
      .select('id, artist_id, user_id, title')
      .eq('id', artworkId)
      .maybeSingle();

    if (artwork) {
      const isOwner = artwork.artist_id === currentUserId || artwork.user_id === currentUserId;
      if (!isOwner && !isAdmin) {
        return { success: false, error: 'Forbidden: You do not have permission to delete this artwork.' };
      }
    }

    // Use admin client if admin or fallback
    const client = isAdmin ? createAdminClient() : supabase;

    // 1. Remove related child records
    try {
      await client.from('artwork_likes').delete().eq('artwork_id', artworkId);
    } catch {}
    try {
      await client.from('artwork_ratings').delete().eq('artwork_id', artworkId);
    } catch {}
    try {
      await client.from('artwork_comments').delete().eq('artwork_id', artworkId);
    } catch {}

    // 2. Delete from 'artworks' table
    let deleteQuery = client.from('artworks').delete().eq('id', artworkId);
    if (!isAdmin) {
      deleteQuery = deleteQuery.or(`artist_id.eq.${currentUserId},user_id.eq.${currentUserId}`);
    }
    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error('Delete artwork error:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // 3. Fallback delete from 'Artwork' table if present
    try {
      await client.from('Artwork').delete().eq('id', artworkId);
    } catch {}

    // 4. Instant cache revalidation across gallery, home, and admin
    revalidatePath('/gallery');
    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, artworkId };
  } catch (err: any) {
    console.error('deleteArtwork exception:', err);
    return { success: false, error: err.message || 'Failed to delete artwork' };
  }
}
