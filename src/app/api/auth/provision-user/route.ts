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

    const avatarUrl = String(body.avatarUrl || body.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '').trim() || null;

    // 5. Upsert profiles table strictly by id
    const profilePayload = {
      id: userId,
      email,
      role: metadataRole,
      first_name: firstName || null,
      last_name: lastName || null,
      title: title || (metadataRole === 'artist' ? 'Artist' : 'Buyer'),
      bio: metadataRole === 'artist' ? 'Welcome to Vivid Art!' : '',
      address: location,
      location: location,
      avatar_url: avatarUrl,
      is_published: true,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error: profileUpdateErr } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', userId);

      if (profileUpdateErr) {
        console.warn('[provision-user] authenticated update notice, attempting upsert:', profileUpdateErr.message);
        await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
      }
    } catch (profileErr) {
      console.warn('[provision-user] profiles upsert warning:', profileErr);
    }

    try {
      await (adminClient as any)
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });
    } catch (adminProfileErr) {
      console.warn('[provision-user] adminClient profiles upsert warning:', adminProfileErr);
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
