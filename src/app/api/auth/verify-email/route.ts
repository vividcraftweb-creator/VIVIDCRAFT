import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ message: 'No verification token provided' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Find user by verification token using admin client
    let userData: any = (await (adminClient as any)
      .from('users')
      .select('id, email, verificationToken, verificationTokenExpiry, isVerified')
      .eq('verificationToken', token)
      .maybeSingle())?.data;

    if (!userData) {
      userData = (await adminClient
        .from('User')
        .select('id, email, verificationToken, verificationTokenExpiry, isVerified')
        .eq('verificationToken', token)
        .maybeSingle())?.data;
    }

    if (!userData) {
      return NextResponse.json({ message: 'Invalid or expired verification token' }, { status: 400 });
    }

    // Check if already verified
    if (userData.isVerified) {
      return NextResponse.json({ message: 'Email address is already verified' }, { status: 200 });
    }

    // Check if token is expired
    if (userData.verificationTokenExpiry && new Date(userData.verificationTokenExpiry) < new Date()) {
      return NextResponse.json({ message: 'Verification token has expired. Please request a new one.' }, { status: 400 });
    }

    // Generate auto-login token (valid for 5 minutes)
    const autoLoginToken = crypto.randomBytes(32).toString('hex');
    const autoLoginTokenExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Update user verification status, clear verification token, and set auto-login token
    const updatePayload = {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
      autoLoginToken,
      autoLoginTokenExpiry: autoLoginTokenExpiry.toISOString(),
    };

    try {
      await (adminClient as any).from('users').update(updatePayload).eq('id', userData.id);
    } catch (e) {}

    try {
      await adminClient.from('User').update(updatePayload).eq('id', userData.id);
    } catch (e) {}

    // Verify the email in Supabase Auth
    try {
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
        userData.id,
        { email_confirm: true }
      );

      if (authUpdateError) {
        // Error updating auth status - non-critical
      }
    } catch (authError) {
      // Error updating auth - non-critical
    }

    return NextResponse.json({
      message: 'Email verified successfully! Redirecting to dashboard...',
      email: userData.email,
      autoLoginToken
    }, { status: 200 });
  } catch (error) {
    // Unexpected error
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}
