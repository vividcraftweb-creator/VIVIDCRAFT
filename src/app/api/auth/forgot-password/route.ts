import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { signupRateLimit, getClientIP } from '@/lib/rate-limit';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export async function POST(req: Request) {
  try {
    // Rate limiting - 5 attempts per 15 minutes per IP (same as signup)
    const clientIp = getClientIP(req as any);
    const rateLimitResult = await signupRateLimit(req as any, clientIp);

    if (!rateLimitResult.success) {
      const resetTime = rateLimitResult.resetTime
        ? new Date(rateLimitResult.resetTime).toISOString()
        : 'soon';
      return NextResponse.json(
        { message: `Too many password reset attempts. Please try again after ${resetTime}` },
        { status: 429 }
      );
    }

    let rawData;
    try {
      rawData = await req.json();
    } catch (jsonError) {
      return NextResponse.json(
        { message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    if (!rawData || typeof rawData !== 'object') {
      return NextResponse.json(
        { message: 'Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    // Validate input using Zod schema
    const validationResult = forgotPasswordSchema.safeParse(rawData);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => issue.message).join(', ');
      return NextResponse.json(
        { message: `Validation error: ${errors}` },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Use admin client to check if user exists and get user info
    const adminClient = createAdminClient();
    const { data: user, error: userError } = await adminClient
      .from('User')
      .select('id, email')
      .eq('email', email)
      .single();

    // Security best practice: Always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (userError || !user) {
      // Still return success to prevent email enumeration
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      }, { status: 200 });
    }

    // Get user's first name for personalized email
    const { data: profile } = await (adminClient as any)
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .maybeSingle();

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Token expires in 1 hour

    // Store reset token in User table (reuse verificationToken field)
    const { error: tokenError } = await adminClient
      .from('User')
      .update({
        verificationToken: resetToken,
        verificationTokenExpiry: tokenExpiry.toISOString(),
      })
      .eq('id', user.id);

    if (tokenError) {
      // Error storing token - but still return success to user
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      }, { status: 200 });
    }

    // Send password reset email using Supabase edge function
    try {
      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/auth/reset-password?token=${resetToken}`;

      const emailResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            to: email,
            template: 'passwordReset',
            templateData: {
              firstName: profile?.first_name || 'User',
              resetLink,
            },
          }),
        }
      );

      if (!emailResponse.ok) {
        // Email sending failed - log error but still return success to user
        console.error('Failed to send password reset email:', await emailResponse.text());
      }
    } catch (emailError) {
      // Email sending error - log but don't expose to user
      console.error('Email sending error:', emailError);
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    }, { status: 200 });
  } catch (error) {
    // Unexpected error
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
