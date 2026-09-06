import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    // 1. Parse standard multipart/form-data from request body
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { message: 'Invalid form data. Expected multipart/form-data body.', error: 'INVALID_FORM_DATA' },
        { status: 400 }
      );
    }

    const file = (formData.get('file') || formData.get('image') || formData.get('avatar')) as File | null;
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { message: 'No image file found in form data.', error: 'NO_FILE' },
        { status: 400 }
      );
    }

    // 2. Validate file size and MIME type
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: 'Image size exceeds the 5MB limit.', error: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { message: 'Invalid file format. Only JPG, PNG, WebP, and GIF images are supported.', error: 'INVALID_FORMAT' },
        { status: 400 }
      );
    }

    // 3. User Authentication (via Supabase session cookie, Bearer token, or fallback userId)
    const adminClient = createAdminClient();
    const supabase = await createClient();
    let user: { id: string; email?: string } | null = null;

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    if (token) {
      try {
        const { data: tokenUser } = await adminClient.auth.getUser(token);
        if (tokenUser?.user) user = tokenUser.user;
      } catch (err) {
        console.warn('Bearer token authentication notice:', err);
      }
    }

    if (!user) {
      try {
        const { data: cookieUser } = await supabase.auth.getUser();
        if (cookieUser?.user) user = cookieUser.user;
      } catch (err) {
        console.warn('Cookie session authentication notice:', err);
      }
    }

    // Fallback: check userId supplied in formData if session retrieval fails
    const formUserId = formData.get('userId') as string | null;
    if (!user && formUserId) {
      const { data: dbUser } = await adminClient
        .from('User')
        .select('id, email')
        .eq('id', formUserId)
        .maybeSingle();

      if (dbUser) {
        user = { id: dbUser.id, email: dbUser.email };
      }
    }

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized. Please sign in to upload a profile picture.', error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 4. Upload file directly to Supabase Storage bucket 'avatars' using official Supabase client
    const fileExt = file.name ? file.name.split('.').pop() || 'png' : 'png';
    const cleanExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const fileName = `${Date.now()}-${uniqueId}.${cleanExt}`;
    const filePath = `${user.id}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    let storageBucket = 'avatars';
    let { data: uploadData, error: uploadError } = await adminClient.storage
      .from(storageBucket)
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'image/png',
        cacheControl: '3600',
        upsert: true,
      });

    // Fallback to 'public-uploads' if 'avatars' bucket has configuration issue
    if (uploadError && uploadError.message?.includes('bucket')) {
      storageBucket = 'public-uploads';
      const fallbackResult = await adminClient.storage
        .from(storageBucket)
        .upload(filePath, fileBuffer, {
          contentType: file.type || 'image/png',
          cacheControl: '3600',
          upsert: true,
        });
      uploadData = fallbackResult.data;
      uploadError = fallbackResult.error;
    }

    if (uploadError || !uploadData) {
      console.error('Supabase Storage upload error:', uploadError);
      return NextResponse.json(
        { message: uploadError?.message || 'Failed to upload image to Supabase Storage.', error: 'STORAGE_ERROR' },
        { status: 500 }
      );
    }

    // 5. Retrieve public URL from Supabase Storage
    const { data: publicUrlData } = adminClient.storage
      .from(storageBucket)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
      return NextResponse.json(
        { message: 'Failed to generate public URL for uploaded image.', error: 'URL_GENERATION_FAILED' },
        { status: 500 }
      );
    }

    const timestamp = new Date().toISOString();

    // 6. Update database profiles table
    try {
      await (adminClient as any)
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          profile_picture: publicUrl,
          updated_at: timestamp,
        })
        .eq('id', user.id);
    } catch (dbErr) {
      console.warn('Profile table avatar_url update notice:', dbErr);
    }

    // Also update legacy Profile table if it exists
    try {
      await adminClient
        .from('Profile')
        .update({
          profilePicture: publicUrl,
          updatedAt: timestamp,
        })
        .eq('userId', user.id);
    } catch {}

    // 7. Clean Supabase Auth user metadata so it only has the clean public URL (never base64 bloat)
    try {
      const { data: currentUserData } = await adminClient.auth.admin.getUserById(user.id);
      const existingMeta = currentUserData?.user?.user_metadata || {};
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...existingMeta,
          avatar_url: publicUrl,
          picture: publicUrl,
        },
      });
    } catch (metaErr) {
      console.warn('User metadata avatar sync notice:', metaErr);
    }

    return NextResponse.json(
      {
        success: true,
        url: publicUrl,
        avatar_url: publicUrl,
        filePath,
        fileName,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Profile upload handler error:', error);
    return NextResponse.json(
      { message: error?.message || 'Internal server error during image upload.', error: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
