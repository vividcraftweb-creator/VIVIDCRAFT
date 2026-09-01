import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'vividcraftweb@gmail.com';
const ADMIN_PASSWORD = 'VividCraftAdmin#2026!';
const ADMIN_FIRST_NAME = 'Vivid';
const ADMIN_LAST_NAME = 'Admin';
const ADMIN_SLUG = 'vivid-craft-admin';

async function performAdminSeed() {
  const supabase = createAdminClient();

  // 1. Check if admin user exists in Supabase Auth
  let authUser: any = null;
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  if (userList?.users) {
    authUser = userList.users.find(
      (u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    );
  }

  if (authUser) {
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      {
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          ...authUser.user_metadata,
          role: 'ADMIN',
          firstName: ADMIN_FIRST_NAME,
          lastName: ADMIN_LAST_NAME,
        },
      }
    );

    if (updateError) {
      throw new Error(`Failed to update auth user: ${updateError.message}`);
    }
    authUser = updatedUser.user;
  } else {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: 'ADMIN',
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
      },
    });

    if (createError) {
      throw new Error(`Failed to create auth user: ${createError.message}`);
    }
    authUser = newUser.user;
  }

  // 2. Ensure User record in database
  const { data: existingDbUser } = await supabase
    .from('User')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existingDbUser) {
    const { error: userUpdateError } = await supabase
      .from('User')
      .update({
        email: ADMIN_EMAIL,
        role: 'ADMIN',
        isVerified: true,
        profileCompleted: true,
        subscriptionPlan: 'CLIENT_ENTERPRISE',
        tokens: 999999,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', authUser.id);

    if (userUpdateError) {
      throw new Error(`Failed to update User table: ${userUpdateError.message}`);
    }
  } else {
    const { error: userInsertError } = await supabase
      .from('User')
      .insert({
        id: authUser.id,
        email: ADMIN_EMAIL,
        role: 'ADMIN',
        isVerified: true,
        profileCompleted: true,
        subscriptionPlan: 'CLIENT_ENTERPRISE',
        tokens: 999999,
        jobPostsUsed: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    if (userInsertError) {
      throw new Error(`Failed to insert User table: ${userInsertError.message}`);
    }
  }

  // 3. Ensure Profile record in database
  const { data: existingProfile } = await supabase
    .from('Profile')
    .select('*')
    .eq('userId', authUser.id)
    .maybeSingle();

  if (existingProfile) {
    const { error: profileUpdateError } = await supabase
      .from('Profile')
      .update({
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        title: 'System Administrator',
        bio: 'Vivid Craft Super Admin',
        verified: true,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', existingProfile.id);

    if (profileUpdateError) {
      throw new Error(`Failed to update Profile table: ${profileUpdateError.message}`);
    }
  } else {
    const { error: profileInsertError } = await supabase
      .from('Profile')
      .insert({
        id: crypto.randomUUID(),
        userId: authUser.id,
        slug: ADMIN_SLUG,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        title: 'System Administrator',
        bio: 'Vivid Craft Super Admin',
        verified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    if (profileInsertError) {
      throw new Error(`Failed to insert Profile table: ${profileInsertError.message}`);
    }
  }

  return {
    id: authUser.id,
    email: ADMIN_EMAIL,
    role: 'ADMIN',
    firstName: ADMIN_FIRST_NAME,
    lastName: ADMIN_LAST_NAME,
  };
}

export async function POST() {
  try {
    const user = await performAdminSeed();
    return NextResponse.json({
      success: true,
      message: 'Admin user set up successfully',
      user,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to seed admin user',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await performAdminSeed();
    return NextResponse.json({
      success: true,
      message: 'Admin user set up successfully',
      user,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to seed admin user',
      },
      { status: 500 }
    );
  }
}
