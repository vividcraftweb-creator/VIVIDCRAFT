import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { getChatCode } from '@/lib/chat-code';
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

    // 2. Insert message using admin client with graceful column fallbacks
    const adminClient = createAdminClient();
    const messageId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const chatCode = getChatCode(user.id, receiver_id);

    let message: any = null;
    let lastError: any = null;

    // Primary attempt: full payload with chat_code and is_read: false
    try {
      const { data: m1, error: e1 } = await adminClient
        .from('messages')
        .insert({
          id: messageId,
          sender_id: user.id,
          receiver_id,
          content: content.trim(),
          chat_code: chatCode,
          created_at: nowIso,
          is_read: false,
        })
        .select()
        .single();

      if (!e1 && m1) {
        message = m1;
      } else {
        lastError = e1;
      }
    } catch (err: any) {
      lastError = err;
    }

    // Fallback 1: if is_read column does not exist or caused an error, bypass is_read
    if (!message) {
      try {
        const { data: m2, error: e2 } = await adminClient
          .from('messages')
          .insert({
            id: messageId,
            sender_id: user.id,
            receiver_id,
            content: content.trim(),
            created_at: nowIso,
          })
          .select()
          .single();

        if (!e2 && m2) {
          message = m2;
          lastError = null;
        } else {
          lastError = e2;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    // Fallback 2: minimal insert letting Postgres generate defaults
    if (!message) {
      try {
        const { data: m3, error: e3 } = await adminClient
          .from('messages')
          .insert({
            sender_id: user.id,
            receiver_id,
            content: content.trim(),
          })
          .select()
          .single();

        if (!e3 && m3) {
          message = m3;
          lastError = null;
        } else {
          lastError = e3;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!message) {
      console.error('[messages/send] Insert error after fallbacks:', JSON.stringify(lastError));
      return NextResponse.json(
        { error: 'Failed to send message', details: lastError?.message || 'Database insert failed' },
        { status: 500 }
      );
    }

    // 3. Load recipient profile so response provides complete user metadata
    let recipientProfile: any = null;
    try {
      const { data: recData } = await adminClient
        .from('profiles')
        .select('id, email, first_name, last_name, full_name, display_name, username, avatar_url, role')
        .eq('id', receiver_id)
        .maybeSingle();
      recipientProfile = recData;
    } catch {}

    // Fallback to User table if profiles table didn't have recipient
    if (!recipientProfile) {
      try {
        const { data: userRec } = await adminClient
          .from('User')
          .select('id, email, Profile(firstName, lastName, profilePicture)')
          .eq('id', receiver_id)
          .maybeSingle();

        if (userRec) {
          const prof = Array.isArray(userRec.Profile) ? userRec.Profile[0] : userRec.Profile;
          recipientProfile = {
            id: userRec.id,
            email: userRec.email,
            first_name: prof?.firstName,
            last_name: prof?.lastName,
            full_name: [prof?.firstName, prof?.lastName].filter(Boolean).join(' ') || userRec.email,
            avatar_url: prof?.profilePicture,
          };
        }
      } catch {}
    }

    // 4. Load sender profile for notification
    let senderProfile: any = null;
    try {
      const { data: sndData } = await adminClient
        .from('profiles')
        .select('id, email, first_name, last_name, full_name, display_name, username, avatar_url, role')
        .eq('id', user.id)
        .maybeSingle();
      senderProfile = sndData;
    } catch {}

    const senderName =
      senderProfile?.full_name ||
      [senderProfile?.first_name, senderProfile?.last_name].filter(Boolean).join(' ') ||
      senderProfile?.display_name ||
      user.email ||
      'Someone';

    const receiverName =
      recipientProfile?.full_name ||
      [recipientProfile?.first_name, recipientProfile?.last_name].filter(Boolean).join(' ') ||
      recipientProfile?.display_name ||
      recipientProfile?.email ||
      'Client';

    // 5. Create in-app notification (non-blocking)
    try {
      await adminClient.from('Notification').insert({
        userId: receiver_id,
        type: 'MESSAGE_RECEIVED',
        message: `New message from ${senderName}`,
        link: '/dashboard?tab=messages',
        read: false,
      });
    } catch {}

    // 6. Return formatted message with complete sender & receiver details
    const formattedMessage = {
      ...message,
      sender_id: message.sender_id || user.id,
      receiver_id: message.receiver_id || receiver_id,
      senderId: message.sender_id || user.id,
      receiverId: message.receiver_id || receiver_id,
      created_at: message.created_at || nowIso,
      createdAt: message.created_at || nowIso,
      is_read: message.is_read ?? false,
      isRead: message.is_read ?? false,
      sender: {
        id: user.id,
        email: senderProfile?.email || user.email,
        full_name: senderName,
        Profile: {
          firstName: senderProfile?.first_name || senderProfile?.display_name || senderName,
          lastName: senderProfile?.last_name || '',
          profilePicture: senderProfile?.avatar_url || null,
        },
      },
      receiver: {
        id: receiver_id,
        email: recipientProfile?.email || null,
        full_name: receiverName,
        Profile: {
          firstName: recipientProfile?.first_name || recipientProfile?.display_name || receiverName,
          lastName: recipientProfile?.last_name || '',
          profilePicture: recipientProfile?.avatar_url || null,
        },
      },
    };

    return NextResponse.json({ success: true, message: formattedMessage }, { status: 200 });
  } catch (err: any) {
    console.error('[messages/send] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
