import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Rate limiting: Store last resend timestamp per email
const resendAttempts = new Map<string, { timestamp: number; count: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_RESENDS_PER_WINDOW = 3; // Max 3 resends per minute
const COOLDOWN_PERIOD = 60 * 1000; // 1 minute cooldown between resends

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    // Rate limiting check
    const now = Date.now();
    const attemptData = resendAttempts.get(email);

    if (attemptData) {
      const timeSinceLastAttempt = now - attemptData.timestamp;

      // Check if user is trying to resend too quickly (within cooldown)
      if (timeSinceLastAttempt < COOLDOWN_PERIOD) {
        const remainingSeconds = Math.ceil((COOLDOWN_PERIOD - timeSinceLastAttempt) / 1000);
        return NextResponse.json(
          {
            message: `Please wait ${remainingSeconds} seconds before requesting another verification email.`
          },
          { status: 429 }
        );
      }

      // Reset count if outside rate limit window
      if (timeSinceLastAttempt > RATE_LIMIT_WINDOW) {
        resendAttempts.set(email, { timestamp: now, count: 1 });
      } else {
        // Check if max resends exceeded
        if (attemptData.count >= MAX_RESENDS_PER_WINDOW) {
          return NextResponse.json(
            { message: 'Too many resend attempts. Please try again later.' },
            { status: 429 }
          );
        }
        attemptData.count++;
        attemptData.timestamp = now;
      }
    } else {
      resendAttempts.set(email, { timestamp: now, count: 1 });
    }

    // Check User table for verification status using admin client
    const adminClient = createAdminClient();
    const { data: userRecord, error: userRecordError } = await adminClient
      .from('User')
      .select('id, email, isVerified')
      .eq('email', email)
      .single();

    if (userRecordError || !userRecord) {
      return NextResponse.json(
        { message: 'No account found with this email address' },
        { status: 404 }
      );
    }

    if (userRecord.isVerified) {
      return NextResponse.json({
        message: 'Email is already verified. You can sign in now.'
      }, { status: 200 });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token expires in 24 hours

    // Update verification token in database using admin client
    const { error: updateError } = await adminClient
      .from('User')
      .update({
        verificationToken,
        verificationTokenExpiry: tokenExpiry.toISOString(),
      })
      .eq('id', userRecord.id);

    if (updateError) {
      return NextResponse.json(
        { message: 'Failed to generate verification token' },
        { status: 500 }
      );
    }

    // Send verification email using Supabase edge function
    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/auth/verify-email?token=${verificationToken}`;

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
          template: 'verification',
          templateData: {
            verificationLink,
          },
        }),
      }
    );

    if (!emailResponse.ok) {
      return NextResponse.json(
        { message: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Verification email sent successfully. Please check your inbox.'
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}
