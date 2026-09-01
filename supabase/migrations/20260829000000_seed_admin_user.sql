-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    admin_user_id uuid;
    admin_email text := 'vividcraftweb@gmail.com';
    admin_password text := 'VividCraftAdmin#2026!';
    encrypted_pw text;
BEGIN
    -- Hash password with bcrypt
    encrypted_pw := crypt(admin_password, gen_salt('bf', 10));

    -- 1. Check if user already exists in auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE lower(email) = lower(admin_email);

    IF admin_user_id IS NULL THEN
        admin_user_id := gen_random_uuid();
        
        -- Insert into auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            admin_user_id,
            'authenticated',
            'authenticated',
            admin_email,
            encrypted_pw,
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"role":"ADMIN","firstName":"Vivid","lastName":"Admin"}'::jsonb,
            now(),
            now(),
            '',
            '',
            '',
            ''
        );

        -- Insert into auth.identities
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            admin_user_id,
            format('{"sub":"%s","email":"%s"}', admin_user_id::text, admin_email)::jsonb,
            'email',
            admin_email,
            now(),
            now(),
            now()
        ) ON CONFLICT DO NOTHING;
    ELSE
        -- Update password, confirmation status and metadata
        UPDATE auth.users
        SET 
            encrypted_password = encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = jsonb_set(
                COALESCE(raw_user_meta_data, '{}'::jsonb),
                '{role}',
                '"ADMIN"'
            ),
            updated_at = now()
        WHERE id = admin_user_id;
    END IF;

    -- 2. Upsert public."User" record
    INSERT INTO public."User" (
        "id",
        "email",
        "role",
        "isVerified",
        "profileCompleted",
        "subscriptionPlan",
        "tokens",
        "jobPostsUsed",
        "createdAt",
        "updatedAt"
    ) VALUES (
        admin_user_id::text,
        admin_email,
        'ADMIN',
        true,
        true,
        'CLIENT_ENTERPRISE',
        999999,
        0,
        now(),
        now()
    )
    ON CONFLICT ("id") DO UPDATE SET
        "role" = 'ADMIN',
        "isVerified" = true,
        "profileCompleted" = true,
        "subscriptionPlan" = 'CLIENT_ENTERPRISE',
        "tokens" = 999999,
        "updatedAt" = now();

    -- Also ensure lookup by email matches
    UPDATE public."User"
    SET "role" = 'ADMIN', "isVerified" = true
    WHERE lower("email") = lower(admin_email);

    -- 3. Upsert public."Profile" record
    INSERT INTO public."Profile" (
        "id",
        "userId",
        "slug",
        "firstName",
        "lastName",
        "title",
        "bio",
        "verified",
        "createdAt",
        "updatedAt"
    ) VALUES (
        gen_random_uuid()::text,
        admin_user_id::text,
        'vivid-craft-admin',
        'Vivid',
        'Admin',
        'System Administrator',
        'Vivid Craft Super Admin with full access privileges',
        true,
        now(),
        now()
    )
    ON CONFLICT ("userId") DO UPDATE SET
        "firstName" = 'Vivid',
        "lastName" = 'Admin',
        "title" = 'System Administrator',
        "bio" = 'Vivid Craft Super Admin with full access privileges',
        "verified" = true,
        "updatedAt" = now();

END $$;
