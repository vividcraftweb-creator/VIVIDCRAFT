import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { slugFromName, ensureUniqueSlug } from '@/lib/slug';
import crypto from 'crypto';

function normalizeRole(roleRaw?: string | null): 'CLIENT' | 'FREELANCER' {
  if (!roleRaw) return 'CLIENT';
  const clean = roleRaw.trim().toUpperCase();
  if (['FREELANCER', 'ARTIST', 'CREATOR', 'SELLER'].includes(clean)) {
    return 'FREELANCER';
  }
  return 'CLIENT';
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

        // 2. Ensure User record exists in DB
        const { data: existingUser } = await adminClient
          .from('User')
          .select('id, role')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingUser) {
          const initialTokens = userRole === 'FREELANCER' ? 250 : 0;
          const defaultSubscriptionPlan = userRole === 'CLIENT' ? 'CLIENT_BUSINESS' : 'FREELANCER_PRO';

          await adminClient.from('User').upsert({
            id: user.id,
            email: user.email || '',
            role: userRole,
            tokens: initialTokens,
            subscriptionPlan: defaultSubscriptionPlan,
            tokenResetAt: new Date().toISOString(),
            jobPostsUsed: 0,
            jobPostsResetAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isVerified: true,
            profileCompleted: !!(firstName && lastName),
          }, { onConflict: 'id' });
        } else if (queryRole && existingUser.role !== userRole) {
          await adminClient
            .from('User')
            .update({
              role: userRole,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', user.id);
        }

        // 3. Ensure profiles table record exists
        try {
          await (adminClient as any).from('profiles').upsert({
            id: user.id,
            first_name: firstName || null,
            last_name: lastName || null,
            role: metadataRole,
            email: user.email || null,
            address: userCountry,
            location: userCountry,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        } catch (pErr) {
          console.warn('Callback profiles upsert warning:', pErr);
        }

        // 4. Ensure Profile record exists in DB
        const { data: existingProfile } = await adminClient
          .from('Profile')
          .select('id, slug, firstName, lastName')
          .eq('userId', user.id)
          .maybeSingle();

        if (!existingProfile) {
          const baseSlug = slugFromName(firstName, lastName);
          const slugToUse = (baseSlug && baseSlug.length >= 2) ? baseSlug : `user-${user.id.substring(0, 8)}`;

          let profileSlug = slugToUse;
          try {
            const { data: existingSlugs } = await adminClient
              .from('Profile')
              .select('slug')
              .like('slug', `${slugToUse}%`);

            const existingSlugList = existingSlugs?.map(s => s.slug) || [];
            profileSlug = ensureUniqueSlug(slugToUse, existingSlugList);
          } catch {
            profileSlug = `user-${user.id.substring(0, 8)}`;
          }

          await adminClient.from('Profile').upsert({
            id: crypto.randomUUID(),
            userId: user.id,
            slug: profileSlug,
            firstName: firstName || null,
            lastName: lastName || null,
            profilePicture: avatarUrl,
            companyName: company,
            country: userCountry,
            location: userCountry,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, { onConflict: 'userId' });
        } else {
          await adminClient
            .from('Profile')
            .update({
              firstName: existingProfile.firstName || firstName || null,
              lastName: existingProfile.lastName || lastName || null,
              profilePicture: avatarUrl || undefined,
              updatedAt: new Date().toISOString(),
            })
            .eq('userId', user.id);
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

