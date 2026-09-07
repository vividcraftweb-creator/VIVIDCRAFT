import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateProfileSlug } from '@/server/utils/profileSlug';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // 1. Environment Variable Validation & Fallback Check
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!supabaseUrl) {
      console.error('PROFILE UPDATE SERVER ERROR: process.env.NEXT_PUBLIC_SUPABASE_URL is missing or undefined');
    }
    if (!serviceRoleKey && !anonKey) {
      console.error('PROFILE UPDATE SERVER ERROR: process.env.SUPABASE_SERVICE_ROLE_KEY and process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY are missing or undefined');
    }

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      const missingKeys: string[] = [];
      if (!supabaseUrl) missingKeys.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!serviceRoleKey && !anonKey) missingKeys.push('SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY');

      console.error(`PROFILE UPDATE SERVER ERROR: Missing environment variables: ${missingKeys.join(', ')}`);
      return NextResponse.json(
        {
          message: `Server configuration error: Missing environment variables (${missingKeys.join(', ')})`,
          error: 'CONFIG_ERROR',
        },
        { status: 500 }
      );
    }

    // 2. User Authentication (JWT Bearer Token or Cookie Session)
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    const adminClient = createAdminClient();
    const supabase = await createClient();
    let user: { id: string; email?: string } | null = null;

    if (token) {
      try {
        const { data: tokenUserData, error: tokenUserError } = await adminClient.auth.getUser(token);
        if (!tokenUserError && tokenUserData?.user) {
          user = tokenUserData.user;
        } else {
          // Try user client as fallback
          const { data: userClientData } = await supabase.auth.getUser(token);
          if (userClientData?.user) {
            user = userClientData.user;
          }
        }
      } catch (tokenErr) {
        console.warn('Bearer token authentication warning:', tokenErr);
      }
    }

    if (!user) {
      try {
        const { data: cookieUserData, error: cookieUserError } = await supabase.auth.getUser();
        if (!cookieUserError && cookieUserData?.user) {
          user = cookieUserData.user;
        }
      } catch (cookieErr) {
        console.warn('Cookie session authentication warning:', cookieErr);
      }
    }

    const body = await request.json().catch(() => ({}));

    // Check body.userId fallback if available
    if (!user && body?.userId) {
      const { data: dbUser } = await adminClient
        .from('User')
        .select('id, email')
        .eq('id', body.userId)
        .maybeSingle();

      if (dbUser) {
        user = { id: dbUser.id, email: dbUser.email };
      }
    }

    if (!user) {
      console.error('PROFILE UPDATE ERROR: Unauthorized (no valid session or Bearer token)');
      return NextResponse.json(
        { message: 'Unauthorized. Please sign in to update your profile.', error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 3. Map input fields (supporting both snake_case and camelCase)
    const firstName = body.first_name ?? body.firstName ?? null;
    const lastName = body.last_name ?? body.lastName ?? null;
    const address = body.address ?? body.location ?? body.businessAddressLine1 ?? null;
    const whatsappNumber = body.whatsapp_number ?? body.whatsappNumber ?? body.phone ?? body.businessPhone ?? null;
    const email = body.email ?? body.businessEmail ?? null;

    // 4. Check for existing profile
    const { data: existingProfile, error: fetchError } = await (adminClient as any)
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('PROFILE UPDATE ERROR (fetch existing):', fetchError);
    }

    const timestamp = new Date().toISOString();

    // Prepare update/insert payload with column safety
    const updatePayload: Record<string, any> = {
      updatedAt: timestamp,
    };

    if (firstName !== null) {
      updatePayload.firstName = firstName;
      updatePayload.first_name = firstName;
    }
    if (lastName !== null) {
      updatePayload.lastName = lastName;
      updatePayload.last_name = lastName;
    }
    if (address !== null) {
      updatePayload.location = address;
      updatePayload.businessAddressLine1 = address;
      updatePayload.address = address;
    }
    if (whatsappNumber !== null) {
      updatePayload.phone = whatsappNumber;
      updatePayload.businessPhone = whatsappNumber;
      updatePayload.whatsapp_number = whatsappNumber;
    }
    if (email !== null) {
      updatePayload.businessEmail = email;
      updatePayload.email = email;
    }

    // Pass extra fields if provided
    if (body.title !== undefined) updatePayload.title = body.title;
    if (body.bio !== undefined) updatePayload.bio = body.bio;
    if (body.skills !== undefined) updatePayload.skills = body.skills;
    if (body.rate !== undefined) updatePayload.rate = body.rate ? Number(body.rate) : null;
    if (body.portfolio !== undefined) updatePayload.portfolio = body.portfolio;
    if (body.website !== undefined) updatePayload.website = body.website;

    const avatarInput = body.avatar_url ?? body.avatarUrl ?? body.profile_picture ?? body.profilePicture ?? undefined;
    if (avatarInput !== undefined) {
      if (typeof avatarInput === 'string' && !avatarInput.startsWith('data:') && avatarInput.length < 500) {
        updatePayload.avatar_url = avatarInput;
        updatePayload.profile_picture = avatarInput;
        updatePayload.profilePicture = avatarInput;
      } else if (avatarInput === null) {
        updatePayload.avatar_url = null;
        updatePayload.profile_picture = null;
        updatePayload.profilePicture = null;
      }
    }

    if (existingProfile) {
      let slug = existingProfile.slug;
      try {
        if (firstName || lastName) {
          slug = (await generateProfileSlug(
            adminClient,
            firstName ?? existingProfile.firstName,
            lastName ?? existingProfile.lastName,
            existingProfile.id
          )) || existingProfile.slug;
        }
      } catch (slugError) {
        console.warn('PROFILE SLUG WARNING:', slugError);
      }

      updatePayload.slug = slug;

      const { data, error } = await (adminClient as any)
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        // Fallback retry with core columns
        console.warn('First profile update attempt failed, retrying with standard columns...', error.message);
        const standardPayload: Record<string, any> = {
          firstName: firstName ?? existingProfile.firstName,
          lastName: lastName ?? existingProfile.lastName,
          location: address,
          phone: whatsappNumber,
          businessEmail: email,
          businessPhone: whatsappNumber,
          businessAddressLine1: address,
          title: body.title,
          bio: body.bio,
          skills: body.skills,
          rate: body.rate ? Number(body.rate) : undefined,
          portfolio: body.portfolio,
          slug,
          updatedAt: timestamp,
        };
        Object.keys(standardPayload).forEach((key) => standardPayload[key] === undefined && delete standardPayload[key]);

        const { data: retryData, error: retryError } = await (adminClient as any)
          .from('profiles')
          .update(standardPayload)
          .eq('id', user.id)
          .select()
          .single();

        if (retryError) {
          console.error('PROFILE UPDATE ERROR:', retryError);
          return NextResponse.json(
            { message: retryError.message || 'Failed to update profile', error: retryError },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, profile: retryData }, { status: 200 });
      }

      return NextResponse.json({ success: true, profile: data }, { status: 200 });
    } else {
      let slug = `user-${user.id.slice(0, 8)}`;
      try {
        slug = (await generateProfileSlug(
          adminClient,
          firstName,
          lastName
        )) || slug;
      } catch (slugError) {
        console.warn('PROFILE SLUG WARNING:', slugError);
      }

      const insertPayload = {
        id: crypto.randomUUID(),
        userId: user.id,
        ...updatePayload,
        slug,
        createdAt: timestamp,
      };

      const { data, error } = await (adminClient as any)
        .from('profiles')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        // Fallback retry with standard columns
        console.warn('First profile insert attempt failed, retrying with standard columns...', error.message);
        const standardInsertPayload: Record<string, any> = {
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          location: address,
          address: address,
          phone: whatsappNumber,
          whatsapp_number: whatsappNumber,
          email,
          business_email: email,
          title: body.title,
          bio: body.bio,
          skills: body.skills,
          rate: body.rate ? Number(body.rate) : undefined,
          slug,
          created_at: timestamp,
          updated_at: timestamp,
        };
        Object.keys(standardInsertPayload).forEach((key) => standardInsertPayload[key] === undefined && delete standardInsertPayload[key]);

        const { data: retryData, error: retryError } = await (adminClient as any)
          .from('profiles')
          .insert(standardInsertPayload)
          .select()
          .single();

        if (retryError) {
          console.error('PROFILE UPDATE ERROR:', retryError);
          return NextResponse.json(
            { message: retryError.message || 'Failed to update profile', error: retryError },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, profile: retryData }, { status: 200 });
      }

      return NextResponse.json({ success: true, profile: data }, { status: 200 });
    }
  } catch (error: any) {
    console.error('PROFILE UPDATE ERROR:', error);
    const errorMessage = error?.message || (typeof error === 'string' ? error : 'Failed to update profile');
    return NextResponse.json(
      { message: errorMessage, error: error?.message ? { message: error.message } : error },
      { status: 500 }
    );
  }
}
