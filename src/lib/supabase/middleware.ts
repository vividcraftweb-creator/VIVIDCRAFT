import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export function getMiddlewareClient(request: NextRequest, response: NextResponse) {
  let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
  if (!supabaseUrl) {
    supabaseUrl = 'https://placeholder.supabase.co';
  }
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim() || 'placeholder';

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          try {
            return request.cookies.getAll().filter(c => {
              return !c.value.includes('data%3Aimage') && !c.value.includes('data:image');
            });
          } catch {
            return []
          }
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          } catch {
            // Ignore cookie setting errors in server components
          }
        },
      },
    }
  )
}

function clearAuthCookies(res: NextResponse, req: NextRequest) {
  const allCookies = req.cookies.getAll();
  allCookies.forEach(({ name }) => {
    if (
      name.startsWith('sb-') ||
      name.includes('auth-token') ||
      name.includes('supabase') ||
      name.includes('session')
    ) {
      res.cookies.set(name, '', { maxAge: 0, path: '/', expires: new Date(0) });
    }
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Clean bloated base64 cookies that would trigger 494 REQUEST_HEADER_TOO_LARGE
  try {
    const allCookies = request.cookies.getAll();
    for (const cookie of allCookies) {
      const isBloated =
        cookie.value.includes('data%3Aimage') ||
        cookie.value.includes('data:image') ||
        (cookie.name.includes('auth-token.') && parseInt(cookie.name.split('.').pop() || '0', 10) > 8);

      if (isBloated) {
        supabaseResponse.cookies.set(cookie.name, '', {
          maxAge: 0,
          path: '/',
          expires: new Date(0),
        });
      }
    }
  } catch {}

  try {
    const { pathname } = request.nextUrl;

    // Handle /login alias redirect
    if (pathname === '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      return NextResponse.redirect(url);
    }

    const isMockAdmin =
      request.cookies.get('is_admin')?.value === 'true' ||
      request.cookies.get('mock_admin_session')?.value === 'true';

    // If dev mock admin is active, allow all routes
    if (isMockAdmin) {
      return supabaseResponse;
    }

    const hasAuthCookies = request.cookies.getAll().some(
      c => c.name.startsWith('sb-') || c.name.includes('auth-token') || c.name.includes('supabase')
    );

    const supabase = getMiddlewareClient(request, supabaseResponse)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    // Protected routes that require authentication
    const protectedPaths = [
      '/dashboard',
      '/messages',
      '/profile',
      '/profile-editor',
      '/settings',
      '/jobs/create',
      '/proposals',
      '/verification',
      '/billing',
      '/notifications',
      '/admin',
      '/support',
      '/contracts',
      '/invoices',
      '/orders',
    ];
    const isProtectedRoute = protectedPaths.some(path => pathname.startsWith(path))

    // Handle deleted user:
    // If the browser supplied auth cookies but Supabase explicitly rejected them with user not found
    const isUserNotFound = userError && (
      userError.message?.toLowerCase().includes('user not found') ||
      userError.message?.toLowerCase().includes('user_not_found')
    );

    if (hasAuthCookies && isUserNotFound) {
      clearAuthCookies(supabaseResponse, request);

      if (isProtectedRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth/login';
        url.searchParams.set('callbackUrl', pathname);
        url.searchParams.set('logged_out', '1');
        const redirectRes = NextResponse.redirect(url);
        clearAuthCookies(redirectRes, request);
        return redirectRes;
      }
    }

    // Redirect to login if unauthenticated and accessing protected routes
    if ((!user || userError) && isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('callbackUrl', pathname)
      const redirectRes = NextResponse.redirect(url);
      clearAuthCookies(redirectRes, request);
      return redirectRes;
    }

    // Bypass email verification for Google OAuth users and confirmed email accounts
    const isOAuthOrConfirmed =
      user?.app_metadata?.provider === 'google' ||
      user?.app_metadata?.providers?.includes('google') ||
      Boolean(user?.email_confirmed_at) ||
      user?.user_metadata?.isVerified === true;

    // If a Google / OAuth or confirmed user visits /auth/verify-email, redirect to dashboard
    if (user && isOAuthOrConfirmed && pathname.startsWith('/auth/verify-email')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }

    // Check if email is verified for protected routes (using custom isVerified field)
    if (
      user &&
      !isOAuthOrConfirmed &&
      isProtectedRoute &&
      pathname !== '/auth/verify-email'
    ) {
      try {
        // Fetch user from database to check isVerified status
        const { data: dbUser } = await supabase
          .from('User')
          .select('isVerified')
          .eq('id', user.id)
          .single()

        // Only redirect if user exists in DB AND isVerified is explicitly false
        if (dbUser && dbUser.isVerified === false) {
          const url = request.nextUrl.clone()
          url.pathname = '/auth/verify-email'
          url.searchParams.set('email', user.email || '')
          return NextResponse.redirect(url)
        }
      } catch {
        // If query fails, let the user through to the page handlers
      }
    }

    return supabaseResponse
  } catch (err) {
    console.error('Middleware updateSession error:', err);
    return supabaseResponse;
  }
}
