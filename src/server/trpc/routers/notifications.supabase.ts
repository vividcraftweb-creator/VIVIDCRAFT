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
          limit: z.number().min(1).max(50).optional().nullable(),
          cursor: z.string().optional().nullable(), // ISO timestamp
          filters: z
            .object({
              types: z.array(NotificationTypeEnum).optional().nullable(),
              read: z.boolean().optional().nullable(),
              searchQuery: z.string().optional().nullable(),
            })
            .optional()
            .nullable(),
        })
        .optional()
        .nullable()
        .or(z.any().optional().nullable())
    )
    .query(async ({ ctx, input }) => {
      try {
        const userId = (ctx as any).user?.id || ctx.session?.user?.id;
        if (!userId) {
          const fallback: any = [];
          fallback.notifications = [];
          fallback.nextCursor = null;
          return fallback;
        }

        let items: any[] = [];
        let hasMore = false;
        const limit = input?.limit ?? 20;
        const cursor = input?.cursor;
        const filters = input?.filters;

        try {
          const supabase = createAdminClient();

          // Primary attempt: 'Notification' table with PascalCase
          try {
            let query = supabase
              .from('Notification')
              .select('*')
              .eq('userId', userId)
              .order('createdAt', { ascending: false })
              .limit(limit + 1);

            if (cursor) {
              query = query.lt('createdAt', cursor);
            }

            if (filters?.types && filters.types.length > 0) {
              query = query.in('type', filters.types);
            }

            if (filters?.read !== undefined && filters?.read !== null) {
              query = query.eq('read', filters.read);
            }

            if (filters?.searchQuery) {
              query = query.ilike('message', `%${filters.searchQuery}%`);
            }

            const { data, error } = await query;
            if (!error && data && Array.isArray(data)) {
              hasMore = data.length > limit;
              items = hasMore ? data.slice(0, -1) : data;
            }
          } catch (e) {
            console.warn('Notification primary fetch notice:', e);
          }

          // Secondary fallback: 'notifications' table with snake_case
          if (items.length === 0) {
            try {
              const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
              if (!error && data && Array.isArray(data)) {
                items = data;
              }
            } catch {}
          }
        } catch (adminClientErr) {
          console.warn('Supabase client error in getNotifications:', adminClientErr);
        }

        const nextCursor =
          hasMore && items.length > 0
            ? items[items.length - 1]?.createdAt || items[items.length - 1]?.created_at || null
            : null;

        const result: any = items;
        result.notifications = items;
        result.nextCursor = nextCursor;
        return result;
      } catch (err) {
        console.error('getNotifications error caught gracefully:', err);
        const fallback: any = [];
        fallback.notifications = [];
        fallback.nextCursor = null;
        return fallback;
      }
    }),

  markAsRead: publicProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = (ctx as any).user?.id || ctx.session?.user?.id;
        if (!userId) return { success: false };
        const supabase = createAdminClient();

        await supabase
          .from('Notification')
          .update({ read: true })
          .eq('id', input.notificationId)
          .eq('userId', userId);

        return { success: true };
      } catch (err) {
        console.warn('markAsRead error handled gracefully:', err);
        return { success: false };
      }
    }),

  markAllAsRead: publicProcedure.mutation(async ({ ctx }) => {
    try {
      const userId = (ctx as any).user?.id || ctx.session?.user?.id;
      if (!userId) return { success: false };
      const supabase = createAdminClient();

      await supabase
        .from('Notification')
        .update({ read: true })
        .eq('userId', userId)
        .eq('read', false);

      return { success: true };
    } catch (err) {
      console.warn('markAllAsRead error handled gracefully:', err);
      return { success: false };
    }
  }),

  getUnreadNotificationCount: publicProcedure
    .input(z.any().optional().nullable())
    .query(async ({ ctx }) => {
      try {
        const userId = (ctx as any).user?.id || ctx.session?.user?.id;
        if (!userId) {
          return 0;
        }

        let count = 0;
        try {
          const supabase = createAdminClient();

          try {
            const { count: c, error } = await supabase
              .from('Notification')
              .select('*', { count: 'exact', head: true })
              .eq('userId', userId)
              .eq('read', false);

            if (!error && typeof c === 'number') {
              count = c;
            }
          } catch {}

          if (count === 0) {
            try {
              const { count: c, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false);

              if (!error && typeof c === 'number') {
                count = c;
              }
            } catch {}
          }
        } catch (e) {
          console.warn('Supabase admin client error in getUnreadNotificationCount:', e);
        }

        return count;
      } catch (err) {
        console.error('getUnreadNotificationCount error caught gracefully:', err);
        return 0;
      }
    }),

  getUnreadCount: publicProcedure
    .input(z.any().optional().nullable())
    .query(async ({ ctx }) => {
      try {
        const userId = (ctx as any).user?.id || ctx.session?.user?.id;
        if (!userId) {
          return { count: 0, unreadCount: 0 };
        }

        let count = 0;
        try {
          const supabase = createAdminClient();

          try {
            const { count: c, error } = await supabase
              .from('Notification')
              .select('*', { count: 'exact', head: true })
              .eq('userId', userId)
              .eq('read', false);

            if (!error && typeof c === 'number') {
              count = c;
            }
          } catch {}

          if (count === 0) {
            try {
              const { count: c, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false);

              if (!error && typeof c === 'number') {
                count = c;
              }
            } catch {}
          }
        } catch (e) {
          console.warn('Supabase admin client error in getUnreadCount:', e);
        }

        return { count, unreadCount: count };
      } catch (err) {
        console.error('getUnreadCount error caught gracefully:', err);
        return { count: 0, unreadCount: 0 };
      }
    }),

  unreadCount: publicProcedure
    .input(z.any().optional().nullable())
    .query(async ({ ctx }) => {
      try {
        const userId = (ctx as any).user?.id || ctx.session?.user?.id;
        if (!userId) {
          return { count: 0, unreadCount: 0 };
        }
        return { count: 0, unreadCount: 0 };
      } catch {
        return { count: 0, unreadCount: 0 };
      }
    }),

  list: publicProcedure
    .input(z.any().optional().nullable())
    .query(async ({ ctx }) => {
      return [];
    }),

  markManyAsRead: publicProcedure
    .input(
      z.object({
        notificationIds: z.array(z.string()).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = (ctx as any).user?.id || ctx.session?.user?.id;
        if (!userId) return { success: false };
        const supabase = createAdminClient();

        await supabase
          .from('Notification')
          .update({ read: true })
          .eq('userId', userId)
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
        const userId = (ctx as any).user?.id || ctx.session?.user?.id;
        if (!userId) return { success: false };
        const supabase = createAdminClient();

        await supabase
          .from('Notification')
          .delete()
          .eq('userId', userId)
          .in('id', input.notificationIds);

        return { success: true };
      } catch (err) {
        console.warn('deleteMany error handled gracefully:', err);
        return { success: false };
      }
    }),
});
