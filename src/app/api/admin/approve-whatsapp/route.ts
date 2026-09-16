import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check if auth user has category data in user_metadata and persist to profiles
    let extraFields: any = {};
    try {
      const { data: userData } = await adminClient.auth.admin.getUserById(userId);
      const meta = userData?.user?.user_metadata;
      if (meta) {
        if (Array.isArray(meta.mediums) && meta.mediums.length > 0) extraFields.mediums = meta.mediums;
        if (Array.isArray(meta.specialties) && meta.specialties.length > 0) extraFields.specialties = meta.specialties;
        if (Array.isArray(meta.services) && meta.services.length > 0) extraFields.services = meta.services;
        if (Array.isArray(meta.other_categories) && meta.other_categories.length > 0) extraFields.other_categories = meta.other_categories;
        if (extraFields.mediums || extraFields.specialties) {
          extraFields.skills = [...(extraFields.mediums || []), ...(extraFields.specialties || [])];
        }
      }
    } catch (metaErr) {
      console.warn('[approve-whatsapp] meta read notice:', metaErr);
    }

    const { error } = await adminClient
      .from('profiles')
      .update({
        whatsapp_verification_status: 'verified',
        verification_status: 'verified',
        is_verified: true,
        ...extraFields,
      })
      .eq('id', userId);

    if (error) {
      console.warn('[approve-whatsapp] full update notice, attempting fallback:', error.message);
      const { error: fallbackError } = await adminClient
        .from('profiles')
        .update({
          whatsapp_verification_status: 'verified',
          verification_status: 'verified',
          is_verified: true,
        })
        .eq('id', userId);

      if (fallbackError) {
        console.error('[approve-whatsapp] DB update error:', fallbackError.message);
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    console.error('[approve-whatsapp] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
