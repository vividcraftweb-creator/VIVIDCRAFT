import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
    }

    if (data.session) {
      // Redirect to dashboard on success
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // If no code, redirect to the auth-code-error page which will handle hash params
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url));
}
