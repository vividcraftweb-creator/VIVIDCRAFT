import { NextRequest, NextResponse } from 'next/server';
import { uploadArtwork } from '@/actions/uploadArtwork';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let result;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      result = await uploadArtwork(formData);
    } else {
      const json = await req.json();
      result = await uploadArtwork(json);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error: any) {
    console.error('API upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error during artwork upload' },
      { status: 500 }
    );
  }
}
