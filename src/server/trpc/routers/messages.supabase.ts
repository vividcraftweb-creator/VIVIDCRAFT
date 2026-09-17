/**
 * Messages Router - Migrated to Supabase
 * NOTE: messages table uses snake_case: sender_id, receiver_id, created_at, is_read, job_id, proposal_id
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';
import { emailTemplates } from '@/lib/email-edge';
import { scanContentForScams } from '@/lib/fraud-detection';
import { isArtistRole } from '@/lib/artist-filter';
import { getChatCode } from '@/lib/chat-code';

export const messagesRouter = router({
  getConversationPreviews: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const supabase = createAdminClient();

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch conversation previews' });
    }

    const typedMessages = (messages || []) as any[];
    const conversationMap = new Map<string, { lastMessage: any; unreadCount: number }>();

    typedMessages.forEach((msg) => {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          lastMessage: {
            ...msg,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            createdAt: msg.created_at,
            isRead: msg.is_read,
          },
          unreadCount: 0,
        });
      }
      if (msg.receiver_id === userId && !msg.is_read) {
        conversationMap.get(partnerId)!.unreadCount++;
      }
    });

    const result: Record<string, { lastMessage: any; unreadCount: number }> = {};
    conversationMap.forEach((value, key) => { result[key] = value; });
    return result;
  }),

  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const supabase = createAdminClient();

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch conversations' });
    }

    const conversationsMap = new Map();
    (messages || []).forEach((msg: any) => {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, { partnerId, lastMessage: msg, unreadCount: 0 });
      }
      if (msg.receiver_id === userId && !msg.is_read) {
        conversationsMap.get(partnerId).unreadCount++;
      }
    });

    return Array.from(conversationsMap.values());
  }),

  getMessages: protectedProcedure
    .input(z.object({ receiverId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const supabase = createAdminClient();

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${input.receiverId}),and(sender_id.eq.${input.receiverId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch messages' });
      }

      if (!messages || messages.length === 0) return [];

      return (messages as any[]).map((msg) => ({
        ...msg,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        createdAt: msg.created_at,
        isRead: msg.is_read,
        jobId: msg.job_id,
        proposalId: msg.proposal_id,
        job: null,
        proposal: null,
      }));
    }),

  canChat: protectedProcedure
    .input(z.object({ partnerId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (input.partnerId === ctx.session.user.id) return false;
      if (ctx.session.user.role === 'ADMIN') return true;

      const supabase = createAdminClient();

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', ctx.session.user.id)
        .maybeSingle();

      const effectiveCurrentRole = currentProfile?.role || ctx.session.user.role;
      const isCurrentArtist = isArtistRole(effectiveCurrentRole);

      if (isCurrentArtist) {
        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', input.partnerId)
          .maybeSingle();
        if (isArtistRole(partnerProfile?.role)) return false;
      }

      return true;
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      receiverId: z.string(),
      content: z.string(),
      jobId: z.string().optional(),
      proposalId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.receiverId === ctx.session.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot message yourself.' });
      }

      if (ctx.session.user.role !== 'ADMIN') {
        const adminClient = createAdminClient();
        const { data: currentProfile } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', ctx.session.user.id)
          .maybeSingle();

        const effectiveCurrentRole = currentProfile?.role || ctx.session.user.role;
        const isCurrentArtist = isArtistRole(effectiveCurrentRole);

        if (isCurrentArtist) {
          const { data: partnerProfile } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', input.receiverId)
            .maybeSingle();

          if (isArtistRole(partnerProfile?.role)) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Direct messaging between artists is disabled. Artists can only exchange messages with clients.',
            });
          }
        }
      }

      const supabase = createAdminClient();

      // Scan message content for scam patterns BEFORE sending
      try {
        const scamCheck = await scanContentForScams(input.content);
        if (scamCheck.isFlagged && scamCheck.severity >= 8) {
          const adminClient = createAdminClient();
          await adminClient.from('FraudFlag').insert({
            userId: ctx.session.user.id,
            flagType: 'SCAM_CONTENT',
            severity: scamCheck.severity,
            reason: `Message blocked: ${scamCheck.reason}`,
            metadata: JSON.stringify({ matches: scamCheck.matches, blockedContent: input.content.substring(0, 200), receiverId: input.receiverId }),
            riskScore: scamCheck.severity,
            status: 'PENDING',
          });
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Message blocked for security reasons. Please contact support if you believe this is an error.' });
        } else if (scamCheck.isFlagged) {
          const adminClient = createAdminClient();
          await adminClient.from('FraudFlag').insert({
            userId: ctx.session.user.id,
            flagType: 'SCAM_CONTENT',
            severity: scamCheck.severity,
            reason: scamCheck.reason,
            metadata: JSON.stringify({ matches: scamCheck.matches, messageContent: input.content.substring(0, 200), receiverId: input.receiverId }),
            riskScore: scamCheck.severity,
            status: 'PENDING',
          });
        }
      } catch (scanError) {
        if (scanError instanceof TRPCError) throw scanError;
        // Otherwise silent fail for fraud scanning
      }

      // Use admin client to bypass RLS for the insert
      const adminInsertClient = createAdminClient();

      // Try full insert first with chat_code
      const computedChatCode = getChatCode(ctx.session.user.id, input.receiverId);
      let insertPayload: Record<string, any> = {
        sender_id: ctx.session.user.id,
        receiver_id: input.receiverId,
        content: input.content,
        chat_code: computedChatCode,
      };

      // Conditionally add optional fields (only if columns exist in the table)
      if (input.jobId) insertPayload.job_id = input.jobId;
      if (input.proposalId) insertPayload.proposal_id = input.proposalId;

      let { data: message, error } = await adminInsertClient
        .from('messages')
        .insert(insertPayload)
        .select()
        .single();

      // Graceful fallback if chat_code column doesn't exist yet
      if (error && (error.message?.includes('chat_code') || error.code === '42703')) {
        delete insertPayload.chat_code;
        const retryRes = await adminInsertClient
          .from('messages')
          .insert(insertPayload)
          .select()
          .single();
        message = retryRes.data;
        error = retryRes.error;
      }

      if (error || !message) {
        console.error('[sendMessage] Insert error:', JSON.stringify(error));
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to send message' });
      }

      // Create in-app notification
      try {
        const adminSupabase = createAdminClient();
        const { data: sender } = await adminSupabase.from('User').select('Profile(firstName, lastName)').eq('id', ctx.session.user.id).single();
        const senderProfile = Array.isArray(sender?.Profile) ? sender.Profile[0] : sender?.Profile;
        const senderName = senderProfile
          ? `${senderProfile.firstName || ''} ${senderProfile.lastName || ''}`.trim() || ctx.session.user.email || 'Someone'
          : ctx.session.user.email || 'Someone';
        await adminSupabase.from('Notification').insert({
          userId: input.receiverId,
          type: 'MESSAGE_RECEIVED',
          message: `New message from ${senderName}`,
          link: '/dashboard?tab=messages',
          read: false,
        });
      } catch (notificationError) {
        console.error('Failed to create message notification:', notificationError);
      }

      // Send email notification
      try {
        const adminSupabase = createAdminClient();
        const { data: receiver } = await adminSupabase.from('User').select('email, notificationPreferences, Profile(firstName, lastName)').eq('id', input.receiverId).single();
        const { data: sender } = await adminSupabase.from('User').select('Profile(firstName, lastName)').eq('id', ctx.session.user.id).single();
        if (receiver) {
          const notificationPrefs = receiver.notificationPreferences as any;
          if ((notificationPrefs?.emailNotifications ?? true) && (notificationPrefs?.newMessages ?? true)) {
            const senderProfile = Array.isArray(sender?.Profile) ? sender.Profile[0] : sender?.Profile;
            const senderName = senderProfile
              ? `${senderProfile.firstName || ''} ${senderProfile.lastName || ''}`.trim() || ctx.session.user.email || 'Unknown User'
              : ctx.session.user.email || 'Unknown User';
            const messagePreview = input.content.length > 200 ? input.content.substring(0, 200) + '...' : input.content;
            const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://vividcraft.vercel.app';
            await emailTemplates.sendNewMessageEmail(receiver.email, senderName, messagePreview, `${appBaseUrl}/dashboard?tab=messages`);
          }
        }
      } catch (emailError) {
        // Silent fail
      }

      return {
        ...(message as any),
        senderId: (message as any).sender_id,
        receiverId: (message as any).receiver_id,
        createdAt: (message as any).created_at,
        isRead: (message as any).is_read,
      };
    }),

  getUnreadMessageCount: protectedProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', ctx.session.user.id)
      .eq('is_read', false);

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get unread message count' });
    }
    return count || 0;
  }),

  markMessagesAsRead: protectedProcedure
    .input(z.object({ senderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', input.senderId)
        .eq('receiver_id', ctx.session.user.id)
        .eq('is_read', false);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to mark messages as read' });
      }
      return { success: true };
    }),
});
