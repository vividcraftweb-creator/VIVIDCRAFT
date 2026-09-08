import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/['"]/g, '').trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/['"]/g, '').trim();

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('SUPABASE ADMIN ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { message: 'Server configuration error: Missing Supabase Admin credentials', users: [] },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Fetch users from Supabase Auth Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error('Supabase Auth Admin listUsers error:', authError);
    }
    const authUsers = authData?.users || [];

    // 2. Fetch all profile rows from profiles and Profile tables
    const profilesMap = new Map<string, any>();
    try {
      const { data: profilesRows } = await supabaseAdmin.from('profiles').select('*');
      if (profilesRows) {
        profilesRows.forEach((p: any) => {
          if (p.id) profilesMap.set(p.id, p);
        });
      }
    } catch (e) {
      console.warn('Could not fetch from profiles table:', e);
    }

    // 3. Combine both arrays so every user in auth.users appears
    const combinedUsers: any[] = authUsers.map((user) => {
      const profile = profilesMap.get(user.id) || {};
      const role = (
        profile.role ||
        user.user_metadata?.role ||
        user.app_metadata?.role ||
        'CLIENT'
      ).toUpperCase();

      const firstName =
        profile.first_name ||
        profile.firstName ||
        user.user_metadata?.first_name ||
        user.user_metadata?.firstName ||
        user.user_metadata?.name?.split(' ')[0] ||
        '';

      const lastName =
        profile.last_name ||
        profile.lastName ||
        user.user_metadata?.last_name ||
        user.user_metadata?.lastName ||
        user.user_metadata?.name?.split(' ').slice(1).join(' ') ||
        '';

      const address =
        profile.address ||
        profile.location ||
        profile.businessAddressLine1 ||
        '';

      const whatsappNumber =
        profile.whatsapp_number ||
        profile.whatsappNumber ||
        profile.phone ||
        profile.businessPhone ||
        '';

      const email =
        profile.email ||
        profile.businessEmail ||
        user.email ||
        '';

      return {
        id: user.id,
        email: user.email || email,
        role,
        subscriptionPlan: profile.subscriptionPlan || 'FREE',
        isVerified: Boolean(profile.is_verified ?? user.user_metadata?.is_verified ?? false),
        createdAt: user.created_at || new Date().toISOString(),
        lastLoginAt: user.last_sign_in_at || null,
        user_metadata: user.user_metadata || {},
        Profile: {
          id: profile.id || user.id,
          userId: user.id,
          first_name: firstName,
          last_name: lastName,
          firstName,
          lastName,
          address,
          whatsapp_number: whatsappNumber,
          whatsappNumber,
          phone: whatsappNumber,
          email,
          location: address,
        },
      };
    });

    // Also include any profiles not in authUsers if any exist
    profilesMap.forEach((profile, profileId) => {
      if (!combinedUsers.some((u) => u.id === profileId)) {
        combinedUsers.push({
          id: profileId,
          email: profile.email || '',
          role: (profile.role || 'CLIENT').toUpperCase(),
          subscriptionPlan: profile.subscriptionPlan || 'FREE',
          isVerified: Boolean(profile.is_verified ?? false),
          createdAt: profile.created_at || profile.createdAt || new Date().toISOString(),
          lastLoginAt: null,
          user_metadata: {},
          Profile: {
            id: profileId,
            userId: profileId,
            first_name: profile.first_name || profile.firstName || '',
            last_name: profile.last_name || profile.lastName || '',
            firstName: profile.first_name || profile.firstName || '',
            lastName: profile.last_name || profile.lastName || '',
            address: profile.address || profile.location || '',
            whatsapp_number: profile.whatsapp_number || profile.phone || '',
            whatsappNumber: profile.whatsapp_number || profile.phone || '',
            phone: profile.whatsapp_number || profile.phone || '',
            email: profile.email || '',
            location: profile.address || profile.location || '',
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      users: combinedUsers,
      total: combinedUsers.length,
    });
  } catch (error: any) {
    console.error('API /api/admin/users error:', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to fetch users', users: [] },
      { status: 500 }
    );
  }
}
