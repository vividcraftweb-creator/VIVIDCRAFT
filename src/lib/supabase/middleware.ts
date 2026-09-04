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
            return request.cookies.getAll()
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

    // Handle deleted user or invalid session:
    // If the browser supplied auth cookies but Supabase rejected them (User not found, invalid token, etc.)
    if (hasAuthCookies && (!user || userError)) {
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

    // Check if email is verified for protected routes (using custom isVerified field)
    if (
      user &&
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
