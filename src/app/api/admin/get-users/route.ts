import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/['"]/g, '').trim();
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/['"]/g, '').trim();

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ users: [], total: 0, error: 'Missing Supabase Keys' }, { status: 200 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Fetch Users from Auth Admin or tables
    let usersList: any[] = [];
    try {
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
      if (!authErr && authData?.users && authData.users.length > 0) {
        usersList = authData.users;
      }
    } catch (e) {
      console.warn('Auth admin listUsers unavailable:', e);
    }

    // 2. Fetch Profiles from profiles & Profile & User tables
    let profiles: any[] = [];
    try {
      const { data: pData } = await supabaseAdmin.from('profiles').select('*');
      if (pData && Array.isArray(pData)) {
        profiles = pData;
      }
    } catch (e) {}

    try {
      const { data: userTableData } = await supabaseAdmin.from('User').select('*');
      if (userTableData && Array.isArray(userTableData)) {
        userTableData.forEach((u: any) => {
          if (!usersList.some((item) => item.id === u.id)) {
            usersList.push(u);
          }
        });
      }
    } catch (e) {}

    // Fallback if usersList is still empty
    if (usersList.length === 0 && profiles.length > 0) {
      usersList = profiles;
    }

    // 3. Merge users and profiles
    const merged = usersList.map((u: any) => {
      const prof = profiles?.find((p: any) => p.id === u.id) || {};
      const firstName = prof.first_name || u.first_name || u.firstName || u.user_metadata?.first_name || u.user_metadata?.firstName || u.email?.split('@')[0] || 'User';
      const lastName = prof.last_name || u.last_name || u.lastName || u.user_metadata?.last_name || u.user_metadata?.lastName || '';
      const role = (prof.role || u.role || u.user_metadata?.role || u.app_metadata?.role || 'client').toUpperCase();
      const address = prof.address || prof.location || u.address || u.location || '';
      const whatsappNumber = prof.whatsapp_number || prof.phone || u.whatsapp_number || u.phone || '';
      const email = u.email || prof.email || 'N/A';
      const isVerified = u.email_confirmed_at ? true : (u.isVerified ?? false);

      return {
        id: u.id,
        email,
        first_name: firstName,
        last_name: lastName,
        firstName,
        lastName,
        role,
        address,
        whatsapp_number: whatsappNumber,
        created_at: u.created_at || u.createdAt || prof.created_at || new Date().toISOString(),
        createdAt: u.created_at || u.createdAt || prof.created_at || new Date().toISOString(),
        status: isVerified ? 'Verified' : 'Pending',
        isVerified,
        user_metadata: u.user_metadata || {},
        Profile: {
          id: u.id,
          userId: u.id,
          first_name: firstName,
          last_name: lastName,
          firstName,
          lastName,
          address,
          whatsapp_number: whatsappNumber,
          phone: whatsappNumber,
          email,
          location: address,
        },
      };
    });

    return NextResponse.json({ users: merged, total: merged.length }, { status: 200 });
  } catch (error: any) {
    console.error('SERVER ERROR IN GET-USERS:', error);
    return NextResponse.json({ users: [], total: 0, error: error.message }, { status: 200 });
  }
}
