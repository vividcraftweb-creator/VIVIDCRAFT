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
        const styles = meta.art_styles || meta.mediums;
        const specialties = meta.art_specialties || meta.specialties;
        const services = meta.services_offered || meta.services;

        if (Array.isArray(styles) && styles.length > 0) {
          extraFields.art_styles = styles;
          extraFields.mediums = styles;
        }
        if (Array.isArray(specialties) && specialties.length > 0) {
          extraFields.art_specialties = specialties;
          extraFields.specialties = specialties;
        }
        if (Array.isArray(services) && services.length > 0) {
          extraFields.services_offered = services;
          extraFields.services = services;
        }
        if (Array.isArray(meta.other_categories) && meta.other_categories.length > 0) {
          extraFields.other_categories = meta.other_categories;
        }
        if (extraFields.art_styles || extraFields.art_specialties) {
          extraFields.skills = [...(extraFields.art_styles || []), ...(extraFields.art_specialties || [])];
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
