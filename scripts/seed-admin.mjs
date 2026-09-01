import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env then .env.local with override
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ADMIN_EMAIL = 'vividcraftweb@gmail.com';
const ADMIN_PASSWORD = 'VividCraftAdmin#2026!';
const ADMIN_FIRST_NAME = 'Vivid';
const ADMIN_LAST_NAME = 'Admin';
const ADMIN_SLUG = 'vivid-craft-admin';

async function seedAdmin() {
  console.log(`[Seed Admin] Initializing setup for: ${ADMIN_EMAIL}...`);

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[Seed Admin Error] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    process.exit(1);
  }

  let supabase;
  try {
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (clientErr) {
    console.error('[Seed Admin Error] Failed to initialize Supabase client:', clientErr?.message || clientErr);
    process.exit(1);
  }

  // 1. Check if user already exists in Supabase Auth
  let authUser = null;
  try {
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.warn('[Seed Admin Warning] Could not list auth users:', listError?.message || listError);
    } else if (userList?.users) {
      authUser = userList.users.find(u => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    }
  } catch (listCatchErr) {
    console.warn('[Seed Admin Warning] Network / Auth error listing users:', listCatchErr?.message || listCatchErr);
  }

  try {
    if (authUser) {
      console.log(`[Seed Admin] Found existing auth user ID: ${authUser.id}. Updating password and metadata...`);
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
        throw updateError;
      }
      authUser = updatedUser.user;
      console.log('[Seed Admin] Auth user updated successfully.');
    } else {
      console.log('[Seed Admin] Creating new auth user in Supabase Auth...');
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
        throw createError;
      }
      authUser = newUser.user;
      console.log(`[Seed Admin] Created auth user ID: ${authUser.id}`);
    }
  } catch (authOpErr) {
    console.error('[Seed Admin Error] Auth API operation failed:', authOpErr?.message || authOpErr);
    console.log('[Seed Admin Info] Note: You can also apply supabase/migrations/20260829000000_seed_admin_user.sql directly to the PostgreSQL database.');
  }

  if (authUser?.id) {
    // 2. Ensure User record in database
    try {
      console.log('[Seed Admin] Upserting record into "User" table...');
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
          throw userUpdateError;
        }
        console.log('[Seed Admin] User table record updated to ADMIN.');
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
          throw userInsertError;
        }
        console.log('[Seed Admin] User table record created with ADMIN role.');
      }
    } catch (userDbErr) {
      console.error('[Seed Admin Error] Failed to upsert User record:', userDbErr?.message || userDbErr);
    }

    // 3. Ensure Profile record in database
    try {
      console.log('[Seed Admin] Upserting record into "Profile" table...');
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
          throw profileUpdateError;
        }
        console.log('[Seed Admin] Profile table record updated.');
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
          throw profileInsertError;
        }
        console.log('[Seed Admin] Profile table record created.');
      }
    } catch (profileDbErr) {
      console.error('[Seed Admin Error] Failed to upsert Profile record:', profileDbErr?.message || profileDbErr);
    }

    console.log('\n--- SUCCESS ---');
    console.log(`[Seed Admin] Admin user ${ADMIN_EMAIL} is fully configured in Supabase Auth and database with ADMIN role.`);
  }
}

seedAdmin().catch((err) => {
  const errMsg = typeof err === 'string' ? err : err?.message || String(err);
  console.error('[Seed Admin Fatal Error]:', errMsg);
});
