import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { slugFromName, ensureUniqueSlug } from '@/lib/slug';
import crypto from 'crypto';

/**
 * POST /api/auth/provision-user
 *
 * Provisions all DB tables (users, User, profiles, Profile) for an
 * already-authenticated Supabase user. Called after signInWithPassword
 * so the user's session exists. Uses adminClient to bypass RLS.
 *
 * Body: { role, firstName, lastName, title?, location?, country? }
 *
 * The userId is read from the current authenticated session — NOT from
 * the request body — so it cannot be spoofed.
 */
export async function POST(req: Request) {
  try {
    // 1. Verify the caller is authenticated
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawRole = String(body.role || '').trim().toLowerCase();
    const isClient = rawRole === 'client' || rawRole === 'buyer';
    const dbRole: 'FREELANCER' | 'CLIENT' = isClient ? 'CLIENT' : 'FREELANCER';
    const metadataRole = isClient ? 'client' : 'artist';

    const firstName: string = String(body.firstName || '').trim();
    const lastName: string = String(body.lastName || '').trim();
    const title: string = String(body.title || (metadataRole === 'artist' ? 'Artist' : 'Buyer')).trim();
    const location: string = String(body.location || body.country || 'Sri Lanka').trim();

    const adminClient = createAdminClient();
    const userId = authUser.id;
    const email = authUser.email || '';

    // 2. Update auth user_metadata to stamp the role permanently
    try {
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...authUser.user_metadata,
          role: metadataRole,
          user_type: metadataRole,
          userRole: metadataRole,
          role_name: metadataRole,
          account_type: metadataRole,
          first_name: firstName || authUser.user_metadata?.first_name,
          last_name: lastName || authUser.user_metadata?.last_name,
          firstName: firstName || authUser.user_metadata?.firstName,
          lastName: lastName || authUser.user_metadata?.lastName,
        },
      });
    } catch (metaErr) {
      console.warn('[provision-user] user_metadata update warning:', metaErr);
    }

    // 3. Upsert users table (lowercase)
    const userPayload = {
      id: userId,
      email,
      role: dbRole,
      tokens: dbRole === 'FREELANCER' ? 250 : 0,
      subscriptionPlan: dbRole === 'CLIENT' ? 'CLIENT_BUSINESS' : 'FREELANCER_PRO',
      tokenResetAt: new Date().toISOString(),
      jobPostsUsed: 0,
      jobPostsResetAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isVerified: true,
      profileCompleted: !!(firstName && lastName),
    };

    try {
      await (adminClient as any).from('users').upsert(userPayload, { onConflict: 'id' });
    } catch (e) {}

    // 4. Upsert User table (PascalCase)
    try {
      await adminClient.from('User').upsert(userPayload, { onConflict: 'id' });
    } catch (e) {}

    // 5. Upsert profiles table (snake_case)
    try {
      await (adminClient as any).from('profiles').upsert(
        {
          id: userId,
          email,
          role: metadataRole,
          first_name: firstName || null,
          last_name: lastName || null,
          title,
          bio: metadataRole === 'artist' ? 'Welcome to Vivid Art!' : '',
          address: location,
          location,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (profileErr) {
      console.warn('[provision-user] profiles upsert warning:', profileErr);
    }

    // 6. Upsert Profile table (PascalCase)
    try {
      const baseSlug = slugFromName(firstName, lastName);
      const slugToUse =
        baseSlug && baseSlug.length >= 2
          ? baseSlug
          : `user-${userId.substring(0, 8)}`;

      const { data: existingSlugs } = await adminClient
        .from('Profile')
        .select('slug')
        .like('slug', `${slugToUse}%`);

      const existingSlugList = existingSlugs?.map((s: any) => s.slug) || [];
      const profileSlug = ensureUniqueSlug(slugToUse, existingSlugList);

      const { data: existingProfile } = await adminClient
        .from('Profile')
        .select('id')
        .eq('userId', userId)
        .maybeSingle();

      if (!existingProfile) {
        await adminClient.from('Profile').upsert(
          {
            id: crypto.randomUUID(),
            userId,
            slug: profileSlug,
            firstName: firstName || null,
            lastName: lastName || null,
            title,
            bio: metadataRole === 'artist' ? 'Welcome to Vivid Art!' : '',
            location,
            country: location,
            isPublished: true,
            is_published: true,
            verified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { onConflict: 'userId' }
        );
      } else {
        await adminClient
          .from('Profile')
          .update({
            firstName: firstName || null,
            lastName: lastName || null,
            updatedAt: new Date().toISOString(),
          })
          .eq('userId', userId);
      }
    } catch (pErr) {
      console.warn('[provision-user] Profile upsert warning:', pErr);
    }

    return NextResponse.json({ success: true, role: dbRole, metadataRole });
  } catch (err) {
    console.error('[provision-user] unexpected error:', err);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
