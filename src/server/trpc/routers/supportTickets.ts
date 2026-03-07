/**
 * Support Tickets tRPC Router
 * Handles support ticket creation, listing, and messaging for priority support users
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

export const supportTicketsRouter = router({
  /**
   * List all support tickets for the current user
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['open', 'in-progress', 'resolved', 'closed', 'all']).optional().default('all'),
        limit: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Check environment variables
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
          console.error('[SupportTickets.list] NEXT_PUBLIC_SUPABASE_URL is not set');
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Supabase URL not configured',
          });
        }
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.error('[SupportTickets.list] SUPABASE_SERVICE_ROLE_KEY is not set');
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Supabase service role key not configured',
          });
        }

        const supabase = createAdminClient();
        const userId = ctx.session.user.id;

        console.log('[SupportTickets.list] Fetching tickets for user:', userId);
        console.log('[SupportTickets.list] Input status:', input.status, 'limit:', input.limit);

        // First, try a simple query to check if table exists
        const { data: testData, error: testError } = await supabase
          .from('SupportTicket')
          .select('id')
          .limit(1);

        if (testError) {
          console.error('[SupportTickets.list] Test query failed:', testError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Table access error: ${testError.message}`,
            cause: testError,
          });
        }

        console.log('[SupportTickets.list] Test query successful, table exists');

        // Now do the full query
        let query = supabase
          .from('SupportTicket')
          .select('*')
          .eq('userId', userId)
          .order('createdAt', { ascending: false })
          .limit(input.limit);

        if (input.status !== 'all') {
          query = query.eq('status', input.status);
        }

        const { data, error } = await query;

        if (error) {
          console.error('[SupportTickets.list] Database error:', JSON.stringify(error, null, 2));
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to fetch support tickets: ${error.message}`,
            cause: error,
          });
        }

        console.log('[SupportTickets.list] Successfully fetched', data?.length || 0, 'tickets');
        return data || [];
      } catch (error: any) {
        console.error('[SupportTickets.list] Unexpected error:', error);
        console.error('[SupportTickets.list] Error stack:', error?.stack);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Support tickets error: ${error?.message || 'Unknown error'}`,
        });
      }
    }),

  /**
   * Get a single support ticket with all messages
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const userId = ctx.session.user.id;

      // Get ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('SupportTicket')
        .select('*')
        .eq('id', input.id)
        .eq('userId', userId)
        .single();

      if (ticketError || !ticket) {
        console.error('Get ticket by ID error:', ticketError);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Support ticket not found',
        });
      }

      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from('SupportTicketMessage')
        .select(`
          id,
          message,
          isStaffResponse,
          attachmentUrl,
          createdAt,
          sender:senderId (
            id,
            email,
            profile:Profile (
              firstName,
              lastName
            )
          )
        `)
        .eq('ticketId', input.id)
        .order('createdAt', { ascending: true });

      if (messagesError) {
        console.error('Get ticket messages error:', messagesError);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch ticket messages',
        });
      }

      return {
        ...ticket,
        messages: messages || [],
      };
    }),

  /**
   * Create a new support ticket
   */
  create: protectedProcedure
    .input(
      z.object({
        subject: z.string().min(5).max(200),
        message: z.string().min(10).max(5000),
        category: z.enum(['general', 'technical', 'billing', 'feature-request', 'urgent']),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const userId = ctx.session.user.id;

      // Check if user has priority support access
      const { data: user } = await supabase
        .from('User')
        .select('subscriptionPlan, role')
        .eq('id', userId)
        .single();

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Auto-set priority to 'urgent' for urgent category
      const priority = input.category === 'urgent' ? 'urgent' : input.priority;

      // Generate UUID manually since database default isn't working
      const ticketId = crypto.randomUUID();

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('SupportTicket')
        .insert({
          id: ticketId,
          userId,
          subject: input.subject,
          message: input.message,
          category: input.category,
          priority,
          status: 'open',
          createdAt: now,
          updatedAt: now,
        })
        .select()
        .single();

      if (error) {
        console.error('Create support ticket error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create support ticket',
          cause: error,
        });
      }

      return data;
    }),

  /**
   * Add a message/reply to an existing ticket
   */
  addMessage: protectedProcedure
    .input(
      z.object({
        ticketId: z.string(),
        message: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const userId = ctx.session.user.id;

      // Verify ticket ownership
      const { data: ticket } = await supabase
        .from('SupportTicket')
        .select('id, userId, status')
        .eq('id', input.ticketId)
        .eq('userId', userId)
        .single();

      if (!ticket) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Support ticket not found',
        });
      }

      if (ticket.status === 'closed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot add messages to closed tickets',
        });
      }

      // Generate UUID manually since database default isn't working
      const messageId = crypto.randomUUID();

      const { data, error } = await supabase
        .from('SupportTicketMessage')
        .insert({
          id: messageId,
          ticketId: input.ticketId,
          senderId: userId,
          message: input.message,
          isStaffResponse: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Add support ticket message error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add message',
          cause: error,
        });
      }

      // Update ticket status to 'in-progress' if it was 'open'
      if (ticket.status === 'open') {
        await supabase
          .from('SupportTicket')
          .update({ status: 'in-progress' })
          .eq('id', input.ticketId);
      }

      return data;
    }),

  /**
   * Close a support ticket
   */
  close: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const userId = ctx.session.user.id;

      const { data, error } = await supabase
        .from('SupportTicket')
        .update({
          status: 'closed',
          resolvedAt: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('userId', userId)
        .select()
        .single();

      if (error) {
        console.error('Close support ticket error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to close ticket',
          cause: error,
        });
      }

      return data;
    }),

  /**
   * Get support ticket stats for the user
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const userId = ctx.session.user.id;

    const { data: tickets } = await supabase
      .from('SupportTicket')
      .select('status, priority')
      .eq('userId', userId);

    if (!tickets) {
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        urgent: 0,
      };
    }

    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === 'open').length,
      inProgress: tickets.filter((t) => t.status === 'in-progress').length,
      resolved: tickets.filter((t) => t.status === 'resolved').length,
      closed: tickets.filter((t) => t.status === 'closed').length,
      urgent: tickets.filter((t) => t.priority === 'urgent').length,
    };
  }),
});
