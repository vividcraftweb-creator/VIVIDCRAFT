import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { autoLoginToken } = await req.json();

    if (!autoLoginToken) {
      return NextResponse.json({ message: 'No auto-login token provided' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Find user by auto-login token using admin client
    const { data: userData, error: userError } = await adminClient
      .from('User')
      .select('id, email, autoLoginToken, autoLoginTokenExpiry, isVerified')
      .eq('autoLoginToken', autoLoginToken)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ message: 'Invalid auto-login token' }, { status: 400 });
    }

    // Check if user is verified
    if (!userData.isVerified) {
      return NextResponse.json({ message: 'Email not verified' }, { status: 400 });
    }

    // Check if token is expired
    if (userData.autoLoginTokenExpiry && new Date(userData.autoLoginTokenExpiry) < new Date()) {
      // Clear expired token
      await adminClient
        .from('User')
        .update({
          autoLoginToken: null,
          autoLoginTokenExpiry: null,
        })
        .eq('id', userData.id);

      return NextResponse.json({ message: 'Auto-login token has expired. Please sign in manually.' }, { status: 400 });
    }

    // Clear the auto-login token (one-time use)
    const { error: updateError } = await adminClient
      .from('User')
      .update({
        autoLoginToken: null,
        autoLoginTokenExpiry: null,
      })
      .eq('id', userData.id);

    if (updateError) {
      return NextResponse.json({ message: 'Failed to process auto-login' }, { status: 500 });
    }

    // Generate a magic link for auto-login using admin client
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.email,
    });

    if (linkError || !linkData) {
      return NextResponse.json({ message: 'Failed to generate login link' }, { status: 500 });
    }

    // Extract token from the action link URL
    if (!linkData.properties || !linkData.properties.action_link) {
      return NextResponse.json({ message: 'Failed to generate login link' }, { status: 500 });
    }

    const actionLink = linkData.properties.action_link;
    const url = new URL(actionLink);
    const token = url.searchParams.get('token') || url.hash.match(/access_token=([^&]+)/)?.[1];

    if (!token) {
      return NextResponse.json({ message: 'Failed to extract token' }, { status: 500 });
    }

    // Get the regular Supabase client and verify with the hashed token
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: userData.email,
      token: linkData.properties.hashed_token,
      type: 'magiclink'
    });

    if (verifyError) {
      return NextResponse.json({ message: 'Failed to verify login' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Auto-login successful! Redirecting to dashboard...',
      email: userData.email
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Auto-login failed' }, { status: 500 });
  }
}
