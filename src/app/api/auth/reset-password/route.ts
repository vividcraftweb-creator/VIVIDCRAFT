import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema - same password requirements as signup
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export async function POST(req: Request) {
  try {
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
    const validationResult = resetPasswordSchema.safeParse(rawData);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => issue.message).join(', ');
      return NextResponse.json(
        { message: `Validation error: ${errors}` },
        { status: 400 }
      );
    }

    const { token, password } = validationResult.data;

    // Use admin client to find user by reset token
    const adminClient = createAdminClient();
    const { data: user, error: userError } = await adminClient
      .from('User')
      .select('id, email, verificationToken, verificationTokenExpiry')
      .eq('verificationToken', token)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (!user.verificationTokenExpiry) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const tokenExpiry = new Date(user.verificationTokenExpiry);
    const now = new Date();

    if (tokenExpiry < now) {
      // Token has expired - clear it from database
      await adminClient
        .from('User')
        .update({
          verificationToken: null,
          verificationTokenExpiry: null,
        })
        .eq('id', user.id);

      return NextResponse.json(
        { message: 'Reset token has expired. Please request a new password reset link.' },
        { status: 400 }
      );
    }

    // Update password using Supabase Auth Admin API
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { message: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }

    // Clear the reset token from database
    const { error: clearTokenError } = await adminClient
      .from('User')
      .update({
        verificationToken: null,
        verificationTokenExpiry: null,
      })
      .eq('id', user.id);

    if (clearTokenError) {
      // Log error but don't fail the request - password was already updated
      console.error('Error clearing reset token:', clearTokenError);
    }

    return NextResponse.json({
      message: 'Password has been reset successfully. You can now log in with your new password.',
    }, { status: 200 });
  } catch (error) {
    // Unexpected error
    console.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
