/**
 * Messages Router - Migrated to Supabase
 * Handles all messaging operations using Supabase database
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';
import type { Database } from '@/types/database.types';
import { emailTemplates } from '@/lib/email-edge';
import { scanContentForScams } from '@/lib/fraud-detection';

type MessageRow = Database['public']['Tables']['Message']['Row'];

export const messagesRouter = router({
  // Get conversation previews for all contacts (last message + unread count)
  getConversationPreviews: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const supabase = await createClient();

    // Get all messages where user is sender or receiver
    const { data: messages, error } = await supabase
      .from('Message')
      .select('*')
      .or(`senderId.eq.${userId},receiverId.eq.${userId}`)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch conversation previews',
      });
    }

    const typedMessages = (messages || []) as MessageRow[];
    const conversationMap = new Map<string, { lastMessage: MessageRow; unreadCount: number }>();

    typedMessages.forEach((msg) => {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          lastMessage: msg,
          unreadCount: 0,
        });
      }

      // Count unread messages (received by current user that are unread)
      if (msg.receiverId === userId && !msg.isRead) {
        const conv = conversationMap.get(partnerId)!;
        conv.unreadCount++;
      }
    });

    // Convert to object for easy lookup by partnerId
    const result: Record<string, { lastMessage: MessageRow; unreadCount: number }> = {};
    conversationMap.forEach((value, key) => {
      result[key] = value;
    });

    return result;
  }),

  // Get conversations list with priority sorting
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const supabase = createAdminClient();

    // Get all messages where user is sender or receiver
    const { data: messages, error } = await supabase
      .from('Message')
      .select(`
        *,
        sender:User!Message_senderId_fkey(
          id,
          email,
          subscriptionPlan,
          Profile(
            firstName,
            lastName,
            profilePicture
          )
        ),
        receiver:User!Message_receiverId_fkey(
          id,
          email,
          subscriptionPlan,
          Profile(
            firstName,
            lastName,
            profilePicture
          )
        )
      `)
      .or(`senderId.eq.${userId},receiverId.eq.${userId}`)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch conversations',
      });
    }

    // Group by conversation partner and get latest message
    const conversationsMap = new Map();

    (messages || []).forEach((msg) => {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const partner = msg.senderId === userId ? msg.receiver : msg.sender;

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          partnerId,
          partner,
          lastMessage: msg,
          unreadCount: 0,
        });
      }

      // Count unread messages from this partner
      if (msg.receiverId === userId && !msg.isRead) {
        const conv = conversationsMap.get(partnerId);
        conv.unreadCount++;
      }
    });

    const conversations = Array.from(conversationsMap.values());

    // Sort conversations by subscription plan priority (Elite > Pro > Free), then by date
    const getPlanPriority = (plan: string): number => {
      if (plan.includes('ELITE')) return 3;
      if (plan.includes('PRO') || plan.includes('BUSINESS')) return 2;
      return 1;
    };

    conversations.sort((a, b) => {
      const partnerA = Array.isArray(a.partner) ? a.partner[0] : a.partner;
      const partnerB = Array.isArray(b.partner) ? b.partner[0] : b.partner;

      const priorityA = getPlanPriority(partnerA.subscriptionPlan);
      const priorityB = getPlanPriority(partnerB.subscriptionPlan);

      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }

      // If same priority, sort by latest message
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });

    return conversations;
  }),

  getMessages: protectedProcedure
    .input(z.object({ receiverId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const supabase = await createClient();

      // Fetch messages first
      const { data: messages, error } = await supabase
        .from('Message')
        .select('*')
        .or(`and(senderId.eq.${userId},receiverId.eq.${input.receiverId}),and(senderId.eq.${input.receiverId},receiverId.eq.${userId})`)
        .order('createdAt', { ascending: true });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch messages',
        });
      }

      if (!messages || messages.length === 0) {
        return [];
      }

      // Get unique job and proposal IDs from messages
      const jobIds = [...new Set(messages.map(m => m.jobId).filter(Boolean))];
      const proposalIds = [...new Set(messages.map(m => m.proposalId).filter(Boolean))];

      // Fetch jobs and proposals in parallel for better performance
      const [jobsResult, proposalsResult] = await Promise.all([
        jobIds.length > 0
          ? supabase.from('Job').select('id, title, budget, slug').in('id', jobIds)
          : Promise.resolve({ data: null }),
        proposalIds.length > 0
          ? supabase.from('Proposal').select('id, proposedRate').in('id', proposalIds)
          : Promise.resolve({ data: null }),
      ]);

      // Build maps for quick lookup
      const jobsMap = new Map();
      if (jobsResult.data) {
        jobsResult.data.forEach(job => jobsMap.set(job.id, job));
      }

      const proposalsMap = new Map();
      if (proposalsResult.data) {
        proposalsResult.data.forEach(proposal => proposalsMap.set(proposal.id, proposal));
      }

      // Attach job and proposal data to messages
      const enrichedMessages = messages.map(msg => ({
        ...msg,
        job: msg.jobId ? jobsMap.get(msg.jobId) || null : null,
        proposal: msg.proposalId ? proposalsMap.get(msg.proposalId) || null : null,
      }));

      return enrichedMessages;
    }),

  canChat: protectedProcedure
    .input(z.object({ partnerId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role === 'ADMIN') return true;

      const supabase = createAdminClient();
      
      const { data, error } = await supabase
        .from('ChatConnection')
        .select('chatEnabled')
        .or(`and(clientId.eq.${ctx.session.user.id},artistId.eq.${input.partnerId}),and(clientId.eq.${input.partnerId},artistId.eq.${ctx.session.user.id})`)
        .eq('chatEnabled', true)
        .maybeSingle();

      if (error || !data) return false;

      return data.chatEnabled;
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        receiverId: z.string(),
        content: z.string(),
        jobId: z.string().optional(),
        proposalId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'ADMIN') {
        const adminClient = createAdminClient();
        const { data: chatAccess } = await adminClient
          .from('ChatConnection')
          .select('chatEnabled')
          .or(`and(clientId.eq.${ctx.session.user.id},artistId.eq.${input.receiverId}),and(clientId.eq.${input.receiverId},artistId.eq.${ctx.session.user.id})`)
          .eq('chatEnabled', true)
          .maybeSingle();

        if (!chatAccess?.chatEnabled) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Chat is not enabled for this connection. Admin approval is required.',
          });
        }
      }

      const supabase = await createClient();

      // Scan message content for scam patterns BEFORE sending
      try {
        const scamCheck = await scanContentForScams(input.content);

        // Block message if severity is very high (8+)
        if (scamCheck.isFlagged && scamCheck.severity >= 8) {
          const adminClient = createAdminClient();

          // Create fraud flag
          await adminClient
            .from('FraudFlag')
            .insert({
              userId: ctx.session.user.id,
              flagType: 'SCAM_CONTENT',
              severity: scamCheck.severity,
              reason: `Message blocked: ${scamCheck.reason}`,
              metadata: JSON.stringify({
                matches: scamCheck.matches,
                blockedContent: input.content.substring(0, 200),
                receiverId: input.receiverId,
              }),
              riskScore: scamCheck.severity,
              status: 'PENDING',
            });

          // Update user trust score
          const { data: user } = await adminClient
            .from('User')
            .select('trustScore')
            .eq('id', ctx.session.user.id)
            .single();

          if (user) {
            const newTrustScore = Math.max(0, (user.trustScore || 100) - 35);
            await adminClient
              .from('User')
              .update({
                trustScore: newTrustScore,
                lastFlaggedAt: new Date().toISOString(),
              })
              .eq('id', ctx.session.user.id);

            // Auto-suspend if trust score drops too low
            if (newTrustScore < 40) {
              await adminClient
                .from('User')
                .update({ isSoftSuspended: true })
                .eq('id', ctx.session.user.id);
            }
          }

          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Message blocked for security reasons. Please contact support if you believe this is an error.',
          });
        } else if (scamCheck.isFlagged) {
          // Flag but allow message for lower severity (5-7)
          const adminClient = createAdminClient();
          await adminClient
            .from('FraudFlag')
            .insert({
              userId: ctx.session.user.id,
              flagType: 'SCAM_CONTENT',
              severity: scamCheck.severity,
              reason: scamCheck.reason,
              metadata: JSON.stringify({
                matches: scamCheck.matches,
                messageContent: input.content.substring(0, 200),
                receiverId: input.receiverId,
              }),
              riskScore: scamCheck.severity,
              status: 'PENDING',
            });
        }
      } catch (scanError) {
        // If it's a TRPCError (message blocked), re-throw it
        if (scanError instanceof TRPCError) {
          throw scanError;
        }
        // Otherwise silent fail for fraud scanning
      }

      const { data: message, error } = await supabase
        .from('Message')
        .insert({
          id: crypto.randomUUID(),
          senderId: ctx.session.user.id,
          receiverId: input.receiverId,
          content: input.content,
          jobId: input.jobId || null,
          proposalId: input.proposalId || null,
          isRead: false,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error || !message) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send message',
        });
      }

      // Create in-app notification for the receiver
      try {
        const adminSupabase = createAdminClient();

        // Get sender's name for notification message
        const { data: sender } = await adminSupabase
          .from('User')
          .select('Profile(firstName, lastName)')
          .eq('id', ctx.session.user.id)
          .single();

        const senderProfile = Array.isArray(sender?.Profile) ? sender.Profile[0] : sender?.Profile;
        const senderName = senderProfile
          ? `${senderProfile.firstName || ''} ${senderProfile.lastName || ''}`.trim() || ctx.session.user.email || 'Someone'
          : ctx.session.user.email || 'Someone';

        // Create notification
        await adminSupabase
          .from('Notification')
          .insert({
            userId: input.receiverId,
            type: 'MESSAGE_RECEIVED',
            message: `New message from ${senderName}`,
            link: '/dashboard?tab=messages',
            read: false,
          });
      } catch (notificationError) {
        // Silent fail for notification creation
        console.error('Failed to create message notification:', notificationError);
      }

      // Send email notification to receiver
      try {
        const adminSupabase = createAdminClient();

        // Get receiver's email and notification preferences
        const { data: receiver } = await adminSupabase
          .from('User')
          .select('email, notificationPreferences, Profile(firstName, lastName)')
          .eq('id', input.receiverId)
          .single();

        // Get sender's profile info
        const { data: sender } = await adminSupabase
          .from('User')
          .select('Profile(firstName, lastName)')
          .eq('id', ctx.session.user.id)
          .single();

        if (receiver) {
          const notificationPrefs = receiver.notificationPreferences as any;
          const emailNotificationsEnabled = notificationPrefs?.emailNotifications ?? true;
          const newMessagesEnabled = notificationPrefs?.newMessages ?? true;

          // Only send email if user has email notifications enabled
          if (emailNotificationsEnabled && newMessagesEnabled) {
            const receiverProfile = Array.isArray(receiver.Profile) ? receiver.Profile[0] : receiver.Profile;
            const receiverName = receiverProfile?.firstName || undefined;

            const senderProfile = Array.isArray(sender?.Profile) ? sender.Profile[0] : sender?.Profile;
            const senderName = senderProfile
              ? `${senderProfile.firstName || ''} ${senderProfile.lastName || ''}`.trim() || ctx.session.user.email || 'Unknown User'
              : ctx.session.user.email || 'Unknown User';

            const messagePreview = input.content.length > 200
              ? input.content.substring(0, 200) + '...'
              : input.content;

            const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://yourdomain.com';

            await emailTemplates.sendNewMessageEmail(
              receiver.email,
              senderName,
              messagePreview,
              `${appBaseUrl}/dashboard?tab=messages`
            );
          }
        }
      } catch (emailError) {
        // Error sending email but don't fail the message send
      }

      return message;
    }),

  getUnreadMessageCount: protectedProcedure.query(async ({ ctx }) => {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('Message')
      .select('*', { count: 'exact', head: true })
      .eq('receiverId', ctx.session.user.id)
      .eq('isRead', false);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get unread message count',
      });
    }

    return count || 0;
  }),

  markMessagesAsRead: protectedProcedure
    .input(z.object({ senderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      const { error } = await supabase
        .from('Message')
        .update({
          isRead: true,
        })
        .eq('senderId', input.senderId)
        .eq('receiverId', ctx.session.user.id)
        .eq('isRead', false);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark messages as read',
        });
      }

      return { success: true };
    }),
});
