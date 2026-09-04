import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export function getMiddlewareClient(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const isMockAdmin =
      request.cookies.get('is_admin')?.value === 'true' ||
      request.cookies.get('mock_admin_session')?.value === 'true';

    // If dev mock admin is active, allow all routes
    if (isMockAdmin) {
      return supabaseResponse;
    }

    const supabase = getMiddlewareClient(request, supabaseResponse)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    // Protected routes that require authentication
    const protectedPaths = ['/dashboard', '/messages', '/profile/edit', '/settings', '/jobs/create', '/proposals', '/verification', '/billing', '/notifications', '/admin', '/support']
    const isProtectedRoute = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

    // Redirect to login if not authenticated and trying to access protected routes
    if (
      (!user || userError) &&
      isProtectedRoute
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/signin'
      url.searchParams.set('callbackUrl', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // Check if email is verified for protected routes (using custom isVerified field)
    if (
      user &&
      isProtectedRoute &&
      request.nextUrl.pathname !== '/auth/verify-email'
    ) {
      try {
        // Fetch user from database to check isVerified status
        const { data: dbUser } = await supabase
          .from('User')
          .select('isVerified')
          .eq('id', user.id)
          .single()

        // Only redirect if user exists in DB AND isVerified is explicitly false
        // If dbUser is null (row doesn't exist yet), let the user through
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
