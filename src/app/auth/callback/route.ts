import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as any;
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  const queryRole = requestUrl.searchParams.get('role');

  let destination = next;
  if (!destination || destination.includes('verify-email') || destination.includes('auth-code-error')) {
    destination = '/dashboard';
  }

  // Pre-create the redirect response so all auth cookies are explicitly attached to the HTTP redirect response
  const redirectResponse = NextResponse.redirect(new URL(destination, request.url));

  try {
    let supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || 'https://placeholder.supabase.co';
    if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
      supabaseUrl = `https://${supabaseUrl}`;
    }
    const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder';

    const cookieStore = await cookies();

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll().filter(c => {
              return !c.value.includes('data%3Aimage') && !c.value.includes('data:image');
            });
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
                redirectResponse.cookies.set(name, value, options);
              });
            } catch (err) {
              console.warn('Cookie set error in route handler:', err);
            }
          },
        },
      }
    );

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('exchangeCodeForSession error:', error.message);
      }
    } else if (tokenHash && type) {
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type || 'email',
      });
    }

    // Try to ensure session is active and sync profile/metadata
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const metadata = user.user_metadata || {};
      const cleanRole = (queryRole || metadata.role || '').toString().trim().toLowerCase();
      const metadataRole = (cleanRole === 'client' || cleanRole === 'buyer') ? 'client' : 'artist';
      const userRole = metadataRole === 'artist' ? 'FREELANCER' : 'CLIENT';

      try {
        const adminClient = createAdminClient();
        const rawFullName = metadata.full_name || metadata.name || '';
        const nameParts = rawFullName.trim().split(/\s+/);
        const firstName = metadata.given_name || metadata.first_name || metadata.firstName || nameParts[0] || '';
        const lastName = metadata.family_name || metadata.last_name || metadata.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '') || '';
        const userCountry = metadata.country || metadata.location || 'Sri Lanka';
        const avatarUrl = metadata.avatar_url || metadata.picture || null;

        // Auto-confirm email and set verified for Google OAuth users
        await adminClient.auth.admin.updateUserById(user.id, {
          email_confirm: true,
          user_metadata: {
            ...metadata,
            role: metadataRole,
            first_name: firstName,
            last_name: lastName,
            isVerified: true,
          },
        }).catch(() => {});

        // Upsert User record
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
        } catch {}

        try {
          await adminClient.from('User').upsert(userDbPayload, { onConflict: 'id' });
        } catch {}

        // Upsert profiles record
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

        try {
          await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
        } catch {}

        try {
          await (adminClient as any).from('profiles').upsert(profilePayload, { onConflict: 'id' });
        } catch {}
      } catch (syncErr) {
        console.warn('OAuth callback profile sync warning:', syncErr);
      }
    }
  } catch (err) {
    console.error('OAuth code exchange error:', err);
  }

  // Ensure any cookies remaining in cookieStore are attached to the response
  try {
    const finalCookieStore = await cookies();
    finalCookieStore.getAll().forEach((c) => {
      if (!redirectResponse.cookies.has(c.name)) {
        redirectResponse.cookies.set(c.name, c.value);
      }
    });
  } catch {}

  return redirectResponse;
}
