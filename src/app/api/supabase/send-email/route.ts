import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { emailRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // Rate limiting - 10 emails per hour per user
    const rateLimitResult = await emailRateLimit(req, session.user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many email requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    // Call Supabase edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to send email' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
  }
}
