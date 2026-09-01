import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('mock_admin_session');

    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore Supabase sign out errors
    }

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: true });
  }
}
