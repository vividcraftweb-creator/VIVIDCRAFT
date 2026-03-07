/**
 * Admin Support Tickets Router
 * Handles admin operations for viewing and managing all support tickets
 */

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

export const adminSupportTicketsRouter = router({
  /**
   * Get all support tickets (admin view)
   */
  getSupportTickets: adminProcedure
    .input(
      z.object({
        status: z.enum(['open', 'in-progress', 'resolved', 'closed', 'all']).optional().default('all'),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const supabase = requireAdminSupabase(ctx);

      let query = supabase
        .from('SupportTicket')
        .select(`
          id,
          userId,
          subject,
          message,
          category,
          status,
          priority,
          createdAt,
          updatedAt,
          user:User!SupportTicket_userId_fkey(
            id,
            email,
            Profile(firstName, lastName)
          )
        `)
        .order('createdAt', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.status !== 'all') {
        query = query.eq('status', input.status);
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch support tickets.',
        });
      }

      return data || [];
    }),

  /**
   * Get support ticket statistics
   */
  getStats: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    const { data: tickets, error } = await supabase
      .from('SupportTicket')
      .select('status, priority');

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch support ticket statistics.',
      });
    }

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

  /**
   * Get a single support ticket with all messages (admin view)
   */
  getTicketById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const supabase = requireAdminSupabase(ctx);

      // Get ticket with user info
      const { data: ticket, error: ticketError } = await supabase
        .from('SupportTicket')
        .select(`
          *,
          user:User!SupportTicket_userId_fkey(
            id,
            email,
            Profile(firstName, lastName)
          )
        `)
        .eq('id', input.id)
        .single();

      if (ticketError || !ticket) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Support ticket not found.',
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
          sender:User!SupportTicketMessage_senderId_fkey(
            id,
            email,
            Profile(firstName, lastName)
          )
        `)
        .eq('ticketId', input.id)
        .order('createdAt', { ascending: true });

      if (messagesError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch ticket messages.',
        });
      }

      return {
        ...ticket,
        messages: messages || [],
      };
    }),

  /**
   * Update support ticket status (admin)
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['open', 'in-progress', 'resolved', 'closed']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = requireAdminSupabase(ctx);

      const updateData: {
        status: string;
        updatedAt: string;
        resolvedAt?: string;
      } = {
        status: input.status,
        updatedAt: new Date().toISOString(),
      };

      // Set resolvedAt when marking as resolved or closed
      if (input.status === 'resolved' || input.status === 'closed') {
        updateData.resolvedAt = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('SupportTicket')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update support ticket status.',
        });
      }

      return data;
    }),

  /**
   * Add a staff response to a ticket
   */
  addStaffResponse: adminProcedure
    .input(
      z.object({
        ticketId: z.string(),
        message: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = requireAdminSupabase(ctx);
      const adminUserId = ctx.session.user.id;

      // Verify ticket exists
      const { data: ticket, error: ticketError } = await supabase
        .from('SupportTicket')
        .select('id, status, firstResponseAt')
        .eq('id', input.ticketId)
        .single();

      if (ticketError || !ticket) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Support ticket not found.',
        });
      }

      // Add staff message
      const { data: message, error: messageError } = await supabase
        .from('SupportTicketMessage')
        .insert({
          ticketId: input.ticketId,
          senderId: adminUserId,
          message: input.message,
          isStaffResponse: true,
        })
        .select()
        .single();

      if (messageError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add staff response.',
        });
      }

      // Update ticket - set firstResponseAt if this is the first staff response
      const ticketUpdate: {
        status: string;
        updatedAt: string;
        firstResponseAt?: string;
      } = {
        status: 'in-progress',
        updatedAt: new Date().toISOString(),
      };

      if (!ticket.firstResponseAt) {
        ticketUpdate.firstResponseAt = new Date().toISOString();
      }

      await supabase
        .from('SupportTicket')
        .update(ticketUpdate)
        .eq('id', input.ticketId);

      return message;
    }),
});
