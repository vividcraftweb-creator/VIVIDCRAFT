import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    // 1. Verify user authentication (with fallback to auth helper)
    let user: any = null;
    try {
      const userClient = await createClient();
      const { data } = await userClient.auth.getUser();
      user = data?.user || null;
    } catch {}

    if (!user) {
      try {
        user = await getUser();
      } catch {}
    }

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { receiver_id, content } = body;

    if (!receiver_id || !content?.trim()) {
      return NextResponse.json({ error: 'receiver_id and content are required' }, { status: 400 });
    }

    if (receiver_id === user.id) {
      return NextResponse.json({ error: 'You cannot message yourself.' }, { status: 400 });
    }

    // 2. Insert message using admin client to bypass RLS
    const adminClient = createAdminClient();
    const messageId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const { data: message, error: insertError } = await adminClient
      .from('messages')
      .insert({
        id: messageId,
        sender_id: user.id,
        receiver_id,
        content: content.trim(),
        created_at: nowIso,
        is_read: false,
      })
      .select()
      .single();

    if (insertError || !message) {
      console.error('[messages/send] Insert error:', JSON.stringify(insertError));
      return NextResponse.json(
        { error: 'Failed to send message', details: insertError?.message },
        { status: 500 }
      );
    }

    // 3. Create in-app notification asynchronously (non-blocking)
    try {
      const { data: senderProfile } = await adminClient
        .from('profiles')
        .select('first_name, last_name, display_name')
        .eq('id', user.id)
        .maybeSingle();

      const senderName =
        [senderProfile?.first_name, senderProfile?.last_name].filter(Boolean).join(' ') ||
        senderProfile?.display_name ||
        user.email ||
        'Someone';

      await adminClient.from('Notification').insert({
        userId: receiver_id,
        type: 'MESSAGE_RECEIVED',
        message: `New message from ${senderName}`,
        link: '/dashboard?tab=messages',
        read: false,
      });
    } catch (notifErr) {
      // Non-blocking notification error
    }

    return NextResponse.json({ success: true, message }, { status: 200 });
  } catch (err: any) {
    console.error('[messages/send] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

