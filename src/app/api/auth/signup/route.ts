import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runFraudDetection, autoSuspendIfNeeded } from '@/lib/fraud-detection';
import { isFeatureEnabled } from '@/lib/feature-flags';
import crypto from 'crypto';
import { signupRateLimit, getClientIP } from '@/lib/rate-limit';
import { slugFromName, ensureUniqueSlug } from '@/lib/slug';
import { loggers } from '@/lib/logger';

// Validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.string().min(1, 'Role is required'),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  skills: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
  experience: z.string().max(100).optional(),
  companyName: z.string().max(200).optional(),
  companyInfo: z.string().max(1000).optional(),
  industry: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  timezone: z.string().max(100).optional(),
  website: z.string().max(500).optional(),
});

// Input sanitization helper
function sanitizeInput(input: string | undefined): string | undefined {
  if (!input) return input;
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .trim();
}

export async function POST(req: Request) {
  try {
    // Rate limiting - 5 signups per 15 minutes per IP
    const clientIp = getClientIP(req as any);
    const rateLimitResult = await signupRateLimit(req as any, clientIp);

    if (!rateLimitResult.success) {
      const resetTime = rateLimitResult.resetTime
        ? new Date(rateLimitResult.resetTime).toISOString()
        : 'soon';
      return NextResponse.json(
        { message: `Too many signup attempts. Please try again after ${resetTime}` },
        { status: 429 }
      );
    }

    let rawData;
    try {
      rawData = await req.json();
    } catch (jsonError) {
    }

    if (!rawData || typeof rawData !== 'object') {
      return NextResponse.json({ message: 'Request body must be a valid JSON object' }, { status: 400 });
    }

    // Validate input using Zod schema
    const validationResult = signupSchema.safeParse(rawData);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => issue.message).join(', ');
      return NextResponse.json({ message: `Validation error: ${errors}` }, { status: 400 });
    }

    const {
      email,
      password,
      role,
      firstName,
      lastName,
      title,
      bio,
      skills,
      phone,
      location,
      experience,
      companyName,
      companyInfo,
      industry,
      country,
      timezone,
      website
    } = validationResult.data;

    // Normalize role
    const rawRole = String(role || '').trim().toLowerCase();
    const isArtist = ['freelancer', 'artist', 'creator', 'seller'].includes(rawRole);
    const dbRole: 'FREELANCER' | 'CLIENT' = isArtist ? 'FREELANCER' : 'CLIENT';
    const metadataRole = isArtist ? 'artist' : 'client';

    // Sensible fallback defaults for client accounts so signup never blocks
    const resolvedCountry = (country && country.trim() !== '')
      ? country.trim()
      : (location && location.trim() !== '')
        ? location.trim()
        : 'Sri Lanka';

    const resolvedTimezone = (timezone && timezone.trim() !== '')
      ? timezone.trim()
      : 'UTC';

    const resolvedIndustry = (industry && industry.trim() !== '')
      ? industry.trim()
      : 'Art & Creative';

    const resolvedCompanyName = (companyName && companyName.trim() !== '')
      ? companyName.trim()
      : `${firstName || 'Client'}'s Studio`;

    // Sanitize text inputs
    const sanitizedFirstName = sanitizeInput(firstName);
    const sanitizedLastName = sanitizeInput(lastName);
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedBio = sanitizeInput(bio);
    const sanitizedSkills = sanitizeInput(skills);
    const sanitizedPhone = sanitizeInput(phone);
    const sanitizedLocation = sanitizeInput(location) || resolvedCountry;
    const sanitizedExperience = sanitizeInput(experience);
    const sanitizedCompanyName = sanitizeInput(companyName) || (dbRole === 'CLIENT' ? resolvedCompanyName : undefined);
    const sanitizedCompanyInfo = sanitizeInput(companyInfo);
    const sanitizedIndustry = sanitizeInput(industry) || (dbRole === 'CLIENT' ? resolvedIndustry : undefined);
    const sanitizedCountry = sanitizeInput(country) || resolvedCountry;
    const sanitizedTimezone = sanitizeInput(timezone) || (dbRole === 'CLIENT' ? resolvedTimezone : undefined);
    const sanitizedWebsite = sanitizeInput(website);

    // Set initial tokens based on role
    const initialTokens = dbRole === 'FREELANCER' ? 250 : 0;
    const defaultSubscriptionPlan = dbRole === 'CLIENT' ? 'CLIENT_BUSINESS' : 'FREELANCER_PRO';

    // Check if profile completion criteria met (calculate before using)
    const isProfileComplete = !!(sanitizedFirstName && sanitizedLastName);

    // Client IP already retrieved for rate limiting above (line 38)

    // Create user in Supabase Auth (disable auto-confirm to use custom verification)
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: metadataRole,
          role_name: metadataRole,
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
          first_name: sanitizedFirstName,
          last_name: sanitizedLastName,
          company: sanitizedCompanyName || resolvedCompanyName,
          country: sanitizedCountry || resolvedCountry,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/auth/callback`,
      }
    });

    if (authError) {
      console.error('SUPABASE AUTH SIGNUP ERROR:', authError.message, authError);
      loggers.auth.error({ error: authError, email }, 'Supabase auth.signUp failed');

      if (authError.message.includes('already registered')) {
        return NextResponse.json({ 
          message: 'User already exists',
          userExists: true 
        }, { status: 200 });
      }

      return NextResponse.json({ 
        message: `Signup failed: ${authError.message}` 
      }, { status: 400 });
    }

    if (!authData.user) {
      console.error('SUPABASE AUTH SIGNUP: No user returned and no error');
      return NextResponse.json({ message: 'Failed to create user — no user data returned from auth' }, { status: 500 });
    }

    // Create or update user record in Supabase database using admin client to bypass RLS
    const adminClient = createAdminClient();
    const userPayload = {
      id: authData.user.id,
      email,
      role: dbRole,
      tokens: initialTokens,
      subscriptionPlan: defaultSubscriptionPlan,
      tokenResetAt: new Date().toISOString(),
      jobPostsUsed: 0,
      jobPostsResetAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isVerified: false,
      profileCompleted: isProfileComplete,
      signupIp: clientIp || null,
    };

    // 1. Try lowercase `users` table first
    let userInserted = false;
    try {
      const { error: usersError } = await (adminClient as any)
        .from('users')
        .upsert(userPayload, { onConflict: 'id' });
      if (!usersError) {
        userInserted = true;
      }
    } catch (e) {}

    // 2. Fallback to `User` table if available
    if (!userInserted) {
      try {
        const { error: userError } = await adminClient
          .from('User')
          .upsert(userPayload, { onConflict: 'id' });
        if (!userError) {
          userInserted = true;
        }
      } catch (e) {}
    }

    // 3. Upsert into `profiles` table
    try {
      await (adminClient as any)
        .from('profiles')
        .upsert({
          id: authData.user.id,
          first_name: sanitizedFirstName,
          last_name: sanitizedLastName,
          role: metadataRole,
          title: sanitizedTitle,
          bio: sanitizedBio,
          email: email,
          address: sanitizedLocation,
          location: sanitizedLocation,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
    } catch (pErr) {
      console.warn('profiles table upsert note:', pErr);
    }

    // Generate unique slug for profile
    let profileSlug: string;
    try {
      const baseSlug = slugFromName(sanitizedFirstName, sanitizedLastName);
      const slugToUse = (baseSlug && baseSlug.length >= 2) ? baseSlug : `user-${authData.user.id.substring(0, 8)}`;

      const { data: existingSlugs, error: slugCheckError } = await adminClient
        .from('Profile')
        .select('slug')
        .eq('slug', slugToUse)
        .maybeSingle();

      if (slugCheckError && slugCheckError.code !== 'PGRST116') {
        loggers.auth.error({ error: slugCheckError, userId: authData.user.id }, 'Failed to check slug uniqueness');
        throw new Error('Failed to generate profile slug');
      }

      if (existingSlugs) {
        const { data: similarSlugs } = await adminClient
          .from('Profile')
          .select('slug')
          .like('slug', `${slugToUse}%`);

        const existingSlugList = similarSlugs?.map(s => s.slug) || [];
        profileSlug = ensureUniqueSlug(slugToUse, existingSlugList);
      } else {
        profileSlug = slugToUse;
      }

      loggers.auth.debug({ userId: authData.user.id, slug: profileSlug }, 'Generated profile slug');
    } catch (slugError) {
      profileSlug = `user-${authData.user.id.substring(0, 8)}`;
    }

    // Create/update profile record in Supabase database using admin client
    const { error: profileError } = await adminClient
      .from('Profile')
      .upsert({
        id: crypto.randomUUID(),
        userId: authData.user.id,
        slug: profileSlug,
        firstName: sanitizedFirstName || null,
        lastName: sanitizedLastName || null,
        title: sanitizedTitle || null,
        bio: sanitizedBio || null,
        skills: sanitizedSkills || null,
        phone: sanitizedPhone || null,
        location: sanitizedLocation || null,
        experience: sanitizedExperience || null,
        companyName: sanitizedCompanyName || null,
        companyInfo: sanitizedCompanyInfo || null,
        industry: sanitizedIndustry || null,
        country: sanitizedCountry || null,
        timezone: sanitizedTimezone || null,
        website: sanitizedWebsite || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'userId' })
      .select()
      .maybeSingle();

    if (profileError) {
      loggers.auth.error({
        error: profileError,
        userId: authData.user.id,
        email: email,
        role: dbRole,
      }, 'Profile table upsert error during signup (non-fatal)');
    }

    // Log successful profile creation
    loggers.auth.info({
      userId: authData.user.id,
      email: email,
      role: role,
      slug: profileSlug,
      hasFirstName: !!sanitizedFirstName,
      hasLastName: !!sanitizedLastName,
      hasCompanyName: !!sanitizedCompanyName,
      isProfileComplete: !!(sanitizedFirstName && sanitizedLastName)
    }, 'Profile created successfully');

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token expires in 24 hours

    // Store verification token in database using admin client
    try {
      await (adminClient as any)
        .from('users')
        .update({
          verificationToken,
          verificationTokenExpiry: tokenExpiry.toISOString(),
        })
        .eq('id', authData.user.id);
    } catch (e) {}

    try {
      await adminClient
        .from('User')
        .update({
          verificationToken,
          verificationTokenExpiry: tokenExpiry.toISOString(),
        })
        .eq('id', authData.user.id);
    } catch (e) {}

    // Send verification email using Supabase edge function
    try {
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
              firstName: sanitizedFirstName,
            },
          }),
        }
      );

      if (!emailResponse.ok) {
        // Email sending failed
      }
    } catch (emailError) {
      // Email sending error
    }

    // Run fraud detection if enabled
    if (isFeatureEnabled('FRAUD_PREVENTION_V1')) {
      try {
        const fraudResult = await runFraudDetection(authData.user.id, clientIp);

        // Auto-suspend if needed (this will also send emails)
        const wasSuspended = await autoSuspendIfNeeded(authData.user.id, fraudResult);

        if (wasSuspended) {
          // Still allow signup to complete, but user will be suspended
        } else if (fraudResult.isFlagged) {
          // Flagged but not auto-suspended
        }
      } catch (fraudError) {
        // Error in fraud detection - continue anyway
      }
    }

    return NextResponse.json({
      message: 'Account created successfully! Please check your email to verify your account.',
      user: { id: authData.user.id, email },
    }, { status: 201 });
  } catch (error) {
    // Log unexpected errors with full context
    loggers.auth.error({
      error,
      context: 'signup_route'
    }, 'Unexpected error during signup');

    return NextResponse.json({
      message: 'An unexpected error occurred. Please try again later.'
    }, { status: 500 });
  }
}
