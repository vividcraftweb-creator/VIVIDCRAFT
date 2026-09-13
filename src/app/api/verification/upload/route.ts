import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
  'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { message: 'Invalid form data. Expected multipart/form-data body.', error: 'INVALID_FORM_DATA' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const slot = (formData.get('slot') as string) || 'document';
    const formUserId = formData.get('userId') as string | null;

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { message: 'No file found in form data.', error: 'NO_FILE' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: 'File size exceeds the 10MB limit.', error: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    const fileType = file.type.toLowerCase();
    if (fileType && !ALLOWED_MIME_TYPES.includes(fileType)) {
      return NextResponse.json(
        { message: 'Invalid file format. Please upload JPG, PNG, WebP, or PDF.', error: 'INVALID_FORMAT' },
        { status: 400 }
      );
    }

    // Authenticate user
    const adminClient = createAdminClient();
    const supabase = await createClient();
    let user: { id: string; email?: string } | null = null;

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    if (token) {
      try {
        const { data: tokenUser } = await adminClient.auth.getUser(token);
        if (tokenUser?.user) user = tokenUser.user;
      } catch {}
    }

    if (!user) {
      try {
        const { data: cookieUser } = await supabase.auth.getUser();
        if (cookieUser?.user) user = cookieUser.user;
      } catch {}
    }

    if (!user && formUserId) {
      user = { id: formUserId };
    }

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized. Please sign in to upload verification documents.', error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const fileExt = file.name ? file.name.split('.').pop() || 'jpg' : 'jpg';
    const cleanExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const fileName = `${Date.now()}-${slot.toLowerCase()}-${uniqueId}.${cleanExt}`;
    const filePath = `verification-documents/${user.id}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    let storageBucket = 'verifications';
    let { data: uploadData, error: uploadError } = await adminClient.storage
      .from(storageBucket)
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    // Fallback to 'public-uploads' if 'verifications' bucket is not available
    if (uploadError && (uploadError.message?.includes('bucket') || uploadError.message?.includes('Bucket not found'))) {
      storageBucket = 'public-uploads';
      const fallbackResult = await adminClient.storage
        .from(storageBucket)
        .upload(filePath, fileBuffer, {
          contentType: file.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        });
      uploadData = fallbackResult.data;
      uploadError = fallbackResult.error;
    }

    if (uploadError || !uploadData) {
      console.error('Supabase Storage verification upload error:', uploadError);
      return NextResponse.json(
        { message: uploadError?.message || 'Failed to upload document to storage.', error: 'STORAGE_ERROR' },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = adminClient.storage
      .from(storageBucket)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
      return NextResponse.json(
        { message: 'Failed to retrieve public URL for uploaded file.', error: 'URL_GENERATION_FAILED' },
        { status: 500 }
      );
    }

    const supabaseBaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://edvoffgfattcoladypii.supabase.co').replace(/\/+$/, '');
    let fullPublicUrl = publicUrl;
    if (fullPublicUrl && !fullPublicUrl.startsWith('http')) {
      const cleanPath = fullPublicUrl.replace(/^\/?(verifications\/)?/, '');
      fullPublicUrl = `${supabaseBaseUrl}/storage/v1/object/public/${storageBucket}/${cleanPath}`;
    }

    return NextResponse.json({
      success: true,
      publicUrl: fullPublicUrl,
      filePath,
      fileName: file.name,
      slot,
    });
  } catch (error: any) {
    console.error('Verification upload API route exception:', error);
    return NextResponse.json(
      { message: error?.message || 'Internal server error during document upload.', error: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
