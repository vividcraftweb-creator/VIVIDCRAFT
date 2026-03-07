import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'public-uploads';
const MEDIA_PREFIX = 'job-media';

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const resolvedParams = await context.params;
  const segments = resolvedParams.path;

  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: 'File not specified' }, { status: 404 });
  }

  if (segments.some((segment) => segment.includes('..') || segment.includes('\\'))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const storagePath = [MEDIA_PREFIX, ...segments].join('/');

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(storagePath);

    if (error || !data) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await data.arrayBuffer();
    const fileName = segments[segments.length - 1];

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Content-Length': fileBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (err) {
  }
}
