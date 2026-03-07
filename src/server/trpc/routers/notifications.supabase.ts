/**
 * Notifications Router - Migrated to Supabase
 * Handles all notification operations using Supabase database
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/lib/supabase/server';

const NotificationTypeEnum = z.enum([
  'PROPOSAL_RECEIVED',
  'CONTRACT_STARTED',
  'MILESTONE_FUNDED',
  'MILESTONE_SUBMITTED',
  'MILESTONE_COMPLETED',
  'PAYMENT_RECEIVED',
  'MESSAGE_RECEIVED',
]);

export const notificationsRouter = router({
  getNotifications: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
          cursor: z.string().optional(), // ISO timestamp
          filters: z
            .object({
              types: z.array(NotificationTypeEnum).optional(),
              read: z.boolean().optional(),
              searchQuery: z.string().optional(),
            })
            .optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const limit = input?.limit ?? 20;
      const cursor = input?.cursor;
      const filters = input?.filters;

      let query = supabase
        .from('Notification')
        .select('*')
        .eq('userId', ctx.session.user.id)
        .order('createdAt', { ascending: false })
        .limit(limit + 1); // Fetch one extra to determine if there are more

      // Apply cursor for pagination
      if (cursor) {
        query = query.lt('createdAt', cursor);
      }

      // Apply filters
      if (filters?.types && filters.types.length > 0) {
        query = query.in('type', filters.types);
      }

      if (filters?.read !== undefined) {
        query = query.eq('read', filters.read);
      }

      if (filters?.searchQuery) {
        query = query.ilike('message', `%${filters.searchQuery}%`);
      }

      const { data: notifications, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch notifications',
        });
      }

      const hasMore = (notifications || []).length > limit;
      const items = hasMore ? notifications!.slice(0, -1) : notifications || [];
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].createdAt : null;

      return {
        notifications: items,
        nextCursor,
      };
    }),

  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();

      // Check if notification belongs to user
      const { data: notification, error: fetchError } = await supabase
        .from('Notification')
        .select('userId')
        .eq('id', input.notificationId)
        .single();

      if (fetchError || !notification || notification.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to perform this action.',
        });
      }

      // Update notification
      const { data: updated, error: updateError } = await supabase
        .from('Notification')
        .update({ read: true })
        .eq('id', input.notificationId)
        .select()
        .single();

      if (updateError || !updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark notification as read',
        });
      }

      return updated;
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('Notification')
      .update({ read: true })
      .eq('userId', ctx.session.user.id)
      .eq('read', false);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to mark all notifications as read',
      });
    }

    return { success: true };
  }),

  getUnreadNotificationCount: protectedProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();

    const { count, error } = await supabase
      .from('Notification')
      .select('*', { count: 'exact', head: true })
      .eq('userId', ctx.session.user.id)
      .eq('read', false);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get unread notification count',
      });
    }

    return count || 0;
  }),

  markManyAsRead: protectedProcedure
    .input(
      z.object({
        notificationIds: z.array(z.string()).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();

      // Verify ownership first
      const { data: userNotifications, error: fetchError } = await supabase
        .from('Notification')
        .select('id')
        .eq('userId', ctx.session.user.id)
        .in('id', input.notificationIds);

      if (
        fetchError ||
        !userNotifications ||
        userNotifications.length !== input.notificationIds.length
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Some notifications do not belong to you',
        });
      }

      // Update
      const { error } = await supabase
        .from('Notification')
        .update({ read: true })
        .in('id', input.notificationIds);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark notifications as read',
        });
      }

      return { success: true };
    }),

  deleteMany: protectedProcedure
    .input(
      z.object({
        notificationIds: z.array(z.string()).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();

      // Delete with ownership check
      const { error } = await supabase
        .from('Notification')
        .delete()
        .eq('userId', ctx.session.user.id)
        .in('id', input.notificationIds);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete notifications',
        });
      }

      return { success: true };
    }),
});
