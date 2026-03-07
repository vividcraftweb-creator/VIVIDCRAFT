import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes that require authentication
  const protectedPaths = ['/dashboard', '/messages', '/profile/edit', '/settings', '/jobs/create', '/proposals', '/verification', '/billing', '/notifications', '/admin', '/support']
  const isProtectedRoute = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // Redirect to login if not authenticated and trying to access protected routes
  if (
    !user &&
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
    // Fetch user from database to check isVerified status
    const { data: dbUser } = await supabase
      .from('User')
      .select('isVerified')
      .eq('id', user.id)
      .single()

    // If user doesn't exist in database OR email is not verified, redirect to verify-email
    if (!dbUser || !dbUser.isVerified) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/verify-email'
      url.searchParams.set('email', user.email || '')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
