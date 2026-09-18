import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { CrewMember } from '@/types/crew';

export const dynamic = 'force-dynamic';

let memoryCrew: CrewMember[] = [];

// GET all crew members
export async function GET() {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('crew_members')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return NextResponse.json({ crew: data });
    }
  } catch (err) {
    console.warn('Error fetching crew from DB:', err);
  }

  return NextResponse.json({ crew: memoryCrew });
}

// POST create crew member
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      position,
      avatar_url,
      short_bio,
      full_story = '',
      is_featured = false,
      display_order,
      linkedin_url = '',
      instagram_url = '',
      facebook_url = '',
      twitter_url = '',
      x_url = '',
    } = body;

    if (!name || !position || !avatar_url || !short_bio) {
      return NextResponse.json({ error: 'Name, position, avatar, and short bio are required' }, { status: 400 });
    }

    const resolvedTwitter = (twitter_url || x_url) ? String(twitter_url || x_url).trim() : null;

    const newMember: CrewMember = {
      id: `crew-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: String(name).trim(),
      position: String(position).trim(),
      avatar_url: String(avatar_url).trim(),
      short_bio: String(short_bio).trim(),
      full_story: String(full_story).trim(),
      is_featured: Boolean(is_featured),
      display_order: Number(display_order ?? (memoryCrew.length + 1)),
      linkedin_url: linkedin_url ? String(linkedin_url).trim() : null,
      instagram_url: instagram_url ? String(instagram_url).trim() : null,
      facebook_url: facebook_url ? String(facebook_url).trim() : null,
      twitter_url: resolvedTwitter,
      x_url: resolvedTwitter,
      created_at: new Date().toISOString(),
    };

    // If marked featured, unfeature others in local memory and DB
    if (newMember.is_featured) {
      memoryCrew = memoryCrew.map((c) => ({ ...c, is_featured: false }));
      try {
        const adminClient = createAdminClient();
        await adminClient.from('crew_members').update({ is_featured: false }).neq('id', '00000000-0000-0000-0000-000000000000');
      } catch {}
    }

    // Try DB insert
    try {
      const adminClient = createAdminClient();
      const insertPayload = {
        name: newMember.name,
        position: newMember.position,
        avatar_url: newMember.avatar_url,
        short_bio: newMember.short_bio,
        full_story: newMember.full_story,
        is_featured: newMember.is_featured,
        display_order: newMember.display_order,
        linkedin_url: newMember.linkedin_url,
        instagram_url: newMember.instagram_url,
        facebook_url: newMember.facebook_url,
        twitter_url: newMember.twitter_url,
      };

      const { data, error } = await adminClient
        .from('crew_members')
        .insert([insertPayload])
        .select()
        .single();

      if (!error && data) {
        memoryCrew.unshift(data);
        return NextResponse.json({ member: data, success: true }, { status: 201 });
      }
    } catch (dbErr) {
      console.warn('DB insert failed for crew member, saving in memory:', dbErr);
    }

    memoryCrew.unshift(newMember);
    return NextResponse.json({ member: newMember, success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create crew member' }, { status: 500 });
  }
}

// PATCH update crew member
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      is_featured,
      name,
      position,
      avatar_url,
      short_bio,
      full_story,
      display_order,
      linkedin_url,
      instagram_url,
      facebook_url,
      twitter_url,
      x_url,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Crew Member ID is required' }, { status: 400 });
    }

    let updatedMember: any = null;

    try {
      const adminClient = createAdminClient();
      // If setting featured, unfeature other crew members
      if (is_featured === true) {
        await adminClient.from('crew_members').update({ is_featured: false }).neq('id', id);
        memoryCrew = memoryCrew.map((c) => (c.id === id ? c : { ...c, is_featured: false }));
      }

      const updatePayload: any = {};
      if (typeof is_featured === 'boolean') updatePayload.is_featured = is_featured;
      if (name) updatePayload.name = String(name).trim();
      if (position) updatePayload.position = String(position).trim();
      if (avatar_url) updatePayload.avatar_url = String(avatar_url).trim();
      if (short_bio) updatePayload.short_bio = String(short_bio).trim();
      if (full_story !== undefined) updatePayload.full_story = String(full_story).trim();
      if (typeof display_order === 'number') updatePayload.display_order = display_order;
      if (linkedin_url !== undefined) updatePayload.linkedin_url = linkedin_url ? String(linkedin_url).trim() : null;
      if (instagram_url !== undefined) updatePayload.instagram_url = instagram_url ? String(instagram_url).trim() : null;
      if (facebook_url !== undefined) updatePayload.facebook_url = facebook_url ? String(facebook_url).trim() : null;
      if (twitter_url !== undefined || x_url !== undefined) {
        const finalTw = twitter_url !== undefined ? twitter_url : x_url;
        updatePayload.twitter_url = finalTw ? String(finalTw).trim() : null;
      }
      updatePayload.updated_at = new Date().toISOString();

      const { data, error } = await adminClient
        .from('crew_members')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        updatedMember = data;
      }
    } catch (e) {
      console.warn('Supabase crew update failed:', e);
    }

    const idx = memoryCrew.findIndex((c) => c.id === id);
    if (idx !== -1) {
      const finalTw = twitter_url !== undefined ? twitter_url : x_url;
      memoryCrew[idx] = {
        ...memoryCrew[idx],
        ...(typeof is_featured === 'boolean' ? { is_featured } : {}),
        ...(name ? { name } : {}),
        ...(position ? { position } : {}),
        ...(avatar_url ? { avatar_url } : {}),
        ...(short_bio ? { short_bio } : {}),
        ...(full_story !== undefined ? { full_story } : {}),
        ...(typeof display_order === 'number' ? { display_order } : {}),
        ...(linkedin_url !== undefined ? { linkedin_url: linkedin_url ? String(linkedin_url).trim() : null } : {}),
        ...(instagram_url !== undefined ? { instagram_url: instagram_url ? String(instagram_url).trim() : null } : {}),
        ...(facebook_url !== undefined ? { facebook_url: facebook_url ? String(facebook_url).trim() : null } : {}),
        ...(finalTw !== undefined ? { twitter_url: finalTw ? String(finalTw).trim() : null, x_url: finalTw ? String(finalTw).trim() : null } : {}),
      };
      if (!updatedMember) updatedMember = memoryCrew[idx];
    }

    return NextResponse.json({ member: updatedMember || { id, ...body }, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update crew member' }, { status: 500 });
  }
}

// DELETE crew member
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Crew Member ID is required' }, { status: 400 });
    }

    try {
      const adminClient = createAdminClient();
      await adminClient.from('crew_members').delete().eq('id', id);
    } catch (e) {}

    memoryCrew = memoryCrew.filter((c) => c.id !== id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete crew member' }, { status: 500 });
  }
}
