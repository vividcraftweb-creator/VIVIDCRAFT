import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Authorization check - users can only access their own data unless admin
    if (id !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Forbidden. You can only access your own user data.' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Get user from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(id);

    if (authError || !authData.user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const user = authData.user;

    // Check if email is confirmed in Supabase Auth
    const isVerified = !!user.email_confirmed_at;

    // Return user data from Supabase Auth
    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'FREELANCER',
      isVerified,
      tokens: user.user_metadata?.tokens || (user.user_metadata?.role === 'CLIENT' ? 50 : 10),
      createdAt: user.created_at,
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
