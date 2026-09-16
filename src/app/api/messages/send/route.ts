import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    // Verify the user is authenticated
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
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

    // Use admin client to bypass RLS for the insert
    const adminClient = createAdminClient();

    const { data: message, error: insertError } = await adminClient
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id,
        content: content.trim(),
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

    return NextResponse.json({ success: true, message }, { status: 200 });
  } catch (err: any) {
    console.error('[messages/send] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
