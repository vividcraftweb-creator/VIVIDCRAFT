import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `banner_${Date.now()}.${fileExt}`;

    // Ensure bucket exists
    try {
      await adminClient.storage.createBucket('banners', { public: true });
    } catch {
      // Bucket might already exist, ignore error
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from('banners')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Server banner storage upload error:', uploadError);
      return NextResponse.json(
        { error: uploadError.message || 'Failed to upload image' },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = adminClient.storage.from('banners').getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      fileName,
    });
  } catch (err: any) {
    console.error('Exception in banner upload:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process banner upload' },
      { status: 500 }
    );
  }
}
