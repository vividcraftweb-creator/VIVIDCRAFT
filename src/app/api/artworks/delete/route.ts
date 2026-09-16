import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { deleteArtwork } from '@/actions/deleteArtwork';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const artworkId = body.artworkId || body.id;

    if (!artworkId || typeof artworkId !== 'string') {
      return NextResponse.json({ error: 'artworkId is required' }, { status: 400 });
    }

    const result = await deleteArtwork(artworkId, body.reason);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to delete artwork' }, { status: 400 });
    }

    // Revalidate Next.js cache
    revalidatePath('/gallery');
    revalidatePath('/');
    revalidatePath('/admin');

    return NextResponse.json({ success: true, artworkId });
  } catch (err: any) {
    console.error('Delete artwork API error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error during artwork deletion' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  return POST(req);
}
