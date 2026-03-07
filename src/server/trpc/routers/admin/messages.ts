/**
 * Admin Messages Router
 * Handles message moderation and monitoring
 */

import crypto from 'crypto';
import { router, adminProcedure } from '../../trpc';
import type { Context } from '../../context';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const requireAdminSupabase = (ctx: Context) => {
  const supabase = ctx.adminSupabase;

  if (!supabase) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to initialize admin Supabase client.',
    });
  }

  return supabase;
};

// Simple content flagging patterns
const FLAGGED_PATTERNS = [
  /\b(scam|fraud|fake)\b/i,
  /\b(illegal|unlawful)\b/i,
  /\b(personal\s*email|contact\s*me\s*at)\b/i,
  /\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
];

function isFlagged(content: string): boolean {
  return FLAGGED_PATTERNS.some((pattern) => pattern.test(content));
}

export const adminMessagesRouter = router({
  /**
   * Get all messages with pagination and filtering
   */
  getMessages: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        flaggedOnly: z.boolean().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);
      const { page, limit, flaggedOnly } = input;

      const offset = (page - 1) * limit;

      // Build query
      const query = supabase
        .from('Message')
        .select(
          `
          *,
          sender:User!Message_senderId_fkey(
            id,
            email,
            Profile(firstName, lastName)
          ),
          receiver:User!Message_receiverId_fkey(
            id,
            email,
            Profile(firstName, lastName)
          )
        `,
          { count: 'exact' }
        )
        .order('createdAt', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: messages, error, count } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch messages.',
        });
      }

      // Add flagged status to each message
      const messagesWithFlags = messages?.map((msg) => ({
        ...msg,
        flagged: isFlagged(msg.content),
      })) || [];

      // Filter by flagged if requested
      const filteredMessages = flaggedOnly
        ? messagesWithFlags.filter((msg) => msg.flagged)
        : messagesWithFlags;

      return {
        messages: filteredMessages,
        total: flaggedOnly ? filteredMessages.length : (count || 0),
        page,
        limit,
        totalPages: Math.ceil((flaggedOnly ? filteredMessages.length : (count || 0)) / limit),
      };
    }),

  /**
   * Get message statistics
   */
  getStats: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    // Get all messages
    const { data: allMessages, count: totalMessages } = await supabase
      .from('Message')
      .select('content', { count: 'exact' });

    // Count flagged messages
    const flaggedCount = allMessages?.filter((msg) => isFlagged(msg.content)).length || 0;

    // Get messages from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: last24Hours } = await supabase
      .from('Message')
      .select('*', { count: 'exact', head: true })
      .gte('createdAt', yesterday);

    return {
      totalMessages: totalMessages || 0,
      flaggedMessages: flaggedCount,
      last24Hours: last24Hours || 0,
      flaggedPercentage: totalMessages ? ((flaggedCount / totalMessages) * 100).toFixed(1) : '0',
    };
  }),

  /**
   * Get message by ID
   */
  getMessageById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      const { data: message, error } = await supabase
        .from('Message')
        .select(
          `
          *,
          sender:User!Message_senderId_fkey(
            id,
            email,
            Profile(*)
          ),
          receiver:User!Message_receiverId_fkey(
            id,
            email,
            Profile(*)
          )
        `
        )
        .eq('id', input.id)
        .single();

      if (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Message not found.',
        });
      }

      return {
        ...message,
        flagged: isFlagged(message.content),
      };
    }),

  /**
   * Delete message (moderation action)
   */
  deleteMessage: adminProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // First get the message to log the deletion
      const { data: message } = await supabase
        .from('Message')
        .select('*')
        .eq('id', input.id)
        .single();

      // Delete the message
      const { error } = await supabase
        .from('Message')
        .delete()
        .eq('id', input.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete message.',
        });
      }

      // Log the deletion
      if (message) {
        await supabase.from('AuditLog').insert({
          id: crypto.randomUUID(),
          action: 'DELETE_MESSAGE',
          entityType: 'MESSAGE',
          entityId: input.id,
          userId: ctx.session?.user?.id || null,
          metadata: {
            reason: input.reason,
            senderId: message.senderId,
            receiverId: message.receiverId,
            flagged: isFlagged(message.content),
          },
          createdAt: new Date().toISOString(),
        });
      }

      return { success: true };
    }),

  /**
   * Get messages between two users
   */
  getConversation: adminProcedure
    .input(
      z.object({
        userId1: z.string(),
        userId2: z.string(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      const { data: messages, error } = await supabase
        .from('Message')
        .select(
          `
          *,
          sender:User!Message_senderId_fkey(id, email, Profile(firstName, lastName)),
          receiver:User!Message_receiverId_fkey(id, email, Profile(firstName, lastName))
        `
        )
        .or(
          `and(senderId.eq.${input.userId1},receiverId.eq.${input.userId2}),and(senderId.eq.${input.userId2},receiverId.eq.${input.userId1})`
        )
        .order('createdAt', { ascending: true })
        .limit(input.limit);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch conversation.',
        });
      }

      return messages?.map((msg) => ({
        ...msg,
        flagged: isFlagged(msg.content),
      })) || [];
    }),
});
