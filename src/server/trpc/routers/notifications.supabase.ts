/**
 * Notifications Router - Migrated to Supabase
 * Handles all notification operations using Supabase database
 */

import { router, publicProcedure, protectedProcedure } from '../trpc';
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
  getNotifications: publicProcedure
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
      try {
        if (!ctx.session?.user?.id) {
          return {
            notifications: [],
            nextCursor: null,
          };
        }

        const supabase = createAdminClient();
        const limit = input?.limit ?? 20;
        const cursor = input?.cursor;
        const filters = input?.filters;

        let items: any[] = [];
        let hasMore = false;

        // Primary attempt: 'Notification' table with PascalCase
        try {
          let query = supabase
            .from('Notification')
            .select('*')
            .eq('userId', ctx.session.user.id)
            .order('createdAt', { ascending: false })
            .limit(limit + 1);

          if (cursor) {
            query = query.lt('createdAt', cursor);
          }

          if (filters?.types && filters.types.length > 0) {
            query = query.in('type', filters.types);
          }

          if (filters?.read !== undefined) {
            query = query.eq('read', filters.read);
          }

          if (filters?.searchQuery) {
            query = query.ilike('message', `%${filters.searchQuery}%`);
          }

          const { data, error } = await query;
          if (!error && data) {
            hasMore = data.length > limit;
            items = hasMore ? data.slice(0, -1) : data;
          }
        } catch (e) {
          console.warn('Notification primary fetch notice:', e);
        }

        // Secondary fallback: 'notifications' table with snake_case
        if (items.length === 0) {
          try {
            const { data } = await supabase
              .from('notifications')
              .select('*')
              .eq('user_id', ctx.session.user.id)
              .order('created_at', { ascending: false })
              .limit(limit);
            if (data && Array.isArray(data)) {
              items = data;
            }
          } catch {}
        }

        const nextCursor =
          hasMore && items.length > 0
            ? items[items.length - 1].createdAt || items[items.length - 1].created_at || null
            : null;

        return {
          notifications: items,
          nextCursor,
        };
      } catch (err) {
        console.error('getNotifications error caught gracefully:', err);
        return {
          notifications: [],
          nextCursor: null,
        };
      }
    }),

  markAsRead: publicProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) return { success: false };
        const supabase = createAdminClient();

        await supabase
          .from('Notification')
          .update({ read: true })
          .eq('id', input.notificationId)
          .eq('userId', ctx.session.user.id);

        return { success: true };
      } catch (err) {
        console.warn('markAsRead error handled gracefully:', err);
        return { success: false };
      }
    }),

  markAllAsRead: publicProcedure.mutation(async ({ ctx }) => {
    try {
      if (!ctx.session?.user?.id) return { success: false };
      const supabase = createAdminClient();

      await supabase
        .from('Notification')
        .update({ read: true })
        .eq('userId', ctx.session.user.id)
        .eq('read', false);

      return { success: true };
    } catch (err) {
      console.warn('markAllAsRead error handled gracefully:', err);
      return { success: false };
    }
  }),

  getUnreadNotificationCount: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.session?.user?.id) {
        return 0;
      }

      const supabase = createAdminClient();
      let count = 0;

      try {
        const { count: c, error } = await supabase
          .from('Notification')
          .select('*', { count: 'exact', head: true })
          .eq('userId', ctx.session.user.id)
          .eq('read', false);

        if (!error && typeof c === 'number') {
          count = c;
        }
      } catch {}

      if (count === 0) {
        try {
          const { count: c } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', ctx.session.user.id)
            .eq('read', false);

          if (typeof c === 'number') {
            count = c;
          }
        } catch {}
      }

      return count;
    } catch (err) {
      console.error('getUnreadNotificationCount error caught gracefully:', err);
      return 0;
    }
  }),

  markManyAsRead: publicProcedure
    .input(
      z.object({
        notificationIds: z.array(z.string()).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) return { success: false };
        const supabase = createAdminClient();

        await supabase
          .from('Notification')
          .update({ read: true })
          .eq('userId', ctx.session.user.id)
          .in('id', input.notificationIds);

        return { success: true };
      } catch (err) {
        console.warn('markManyAsRead error handled gracefully:', err);
        return { success: false };
      }
    }),

  deleteMany: publicProcedure
    .input(
      z.object({
        notificationIds: z.array(z.string()).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) return { success: false };
        const supabase = createAdminClient();

        await supabase
          .from('Notification')
          .delete()
          .eq('userId', ctx.session.user.id)
          .in('id', input.notificationIds);

        return { success: true };
      } catch (err) {
        console.warn('deleteMany error handled gracefully:', err);
        return { success: false };
      }
    }),
});
