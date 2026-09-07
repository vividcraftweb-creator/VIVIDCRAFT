import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { slugFromName, ensureUniqueSlug } from '@/lib/slug';
import crypto from 'crypto';

function normalizeRole(roleRaw?: string | null): 'CLIENT' | 'FREELANCER' {
  if (!roleRaw) return 'FREELANCER';
  const clean = roleRaw.trim().toUpperCase();
  if (['CLIENT', 'BUYER', 'CUSTOMER'].includes(clean)) {
    return 'CLIENT';
  }
  return 'FREELANCER';
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as any;
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const queryRole = requestUrl.searchParams.get('role');

  try {
    const supabase = await createClient();
    let session = null;
    let user = null;

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.session) {
        session = data.session;
        user = data.user;
      } else if (error) {
        console.error('exchangeCodeForSession error:', error);
      }
    } else if (tokenHash && type) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type || 'email',
      });
      if (!error && data?.session) {
        session = data.session;
        user = data.user;
      } else if (error) {
        console.error('verifyOtp error:', error);
      }
    }

    if (session && user) {
      const metadata = user.user_metadata || {};
      const userRole = normalizeRole(queryRole || metadata.role);

      try {
        const adminClient = createAdminClient();

        const rawFullName = metadata.full_name || metadata.name || '';
        const nameParts = rawFullName.trim().split(/\s+/);
        const firstName = metadata.given_name || metadata.first_name || metadata.firstName || nameParts[0] || '';
        const lastName = metadata.family_name || metadata.last_name || metadata.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '') || '';
        const userCountry = metadata.country || metadata.location || 'Sri Lanka';
        const company = metadata.company || metadata.companyName || (userRole === 'CLIENT' ? `${firstName || 'Client'}'s Studio` : null);
        const avatarUrl = metadata.avatar_url || metadata.picture || null;

        const metadataRole = userRole === 'FREELANCER' ? 'artist' : 'client';

        // 1. Sync auth user metadata if needed
        if (metadata.role !== metadataRole && metadata.role !== userRole) {
          try {
            await adminClient.auth.admin.updateUserById(user.id, {
              user_metadata: {
                ...metadata,
                role: metadataRole,
                first_name: firstName,
                last_name: lastName,
              },
            });
          } catch (authMetaErr) {
            console.warn('Callback auth metadata update warning:', authMetaErr);
          }
        }

        // 2. Ensure User record exists in DB (try `users` first, then `User`)
        const userDbPayload = {
          id: user.id,
          email: user.email || '',
          role: userRole,
          tokens: userRole === 'FREELANCER' ? 250 : 0,
          subscriptionPlan: userRole === 'CLIENT' ? 'CLIENT_BUSINESS' : 'FREELANCER_PRO',
          tokenResetAt: new Date().toISOString(),
          jobPostsUsed: 0,
          jobPostsResetAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isVerified: true,
          profileCompleted: !!(firstName && lastName),
        };

        try {
          await (adminClient as any).from('users').upsert(userDbPayload, { onConflict: 'id' });
        } catch (e) {}

        try {
          await adminClient.from('User').upsert(userDbPayload, { onConflict: 'id' });
        } catch (e) {}

        // 3. Ensure profiles table record exists using authenticated client (satisfies RLS auth.uid() = id)
        try {
          const profilePayload = {
            id: user.id,
            first_name: firstName || null,
            last_name: lastName || null,
            role: metadataRole,
            email: user.email || null,
            address: userCountry,
            location: userCountry,
            avatar_url: avatarUrl || null,
            is_published: true,
            updated_at: new Date().toISOString(),
          };

          const { error: profileUpdateErr } = await supabase
            .from('profiles')
            .update(profilePayload)
            .eq('id', user.id);

          if (profileUpdateErr) {
            console.warn('Callback profiles update notice, attempting upsert:', profileUpdateErr.message);
            await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
          }

          await (adminClient as any)
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' });
        } catch (pErr) {
          console.warn('Callback profiles upsert warning:', pErr);
        }
      } catch (profileSyncError) {
        console.warn('Callback profile sync warning:', profileSyncError);
      }

      // Determine destination: Buyers/Clients default to Home (/), Artists/Creators default to /dashboard
      let destination = next;
      const hasExplicitNext = requestUrl.searchParams.has('next');
      if (!hasExplicitNext || next === '/dashboard') {
        destination = userRole === 'FREELANCER' ? '/dashboard' : '/';
      }

      // Redirect to destination
      return NextResponse.redirect(new URL(destination, request.url));
    }
  } catch (callbackError) {
    console.error('Error during auth callback:', callbackError);
  }

  // If no code or verification failed, redirect to the auth-code-error page
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url));
}

