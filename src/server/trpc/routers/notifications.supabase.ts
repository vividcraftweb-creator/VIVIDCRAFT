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
        .union([
          z
            .object({
              limit: z.number().min(1).max(50).optional().nullable(),
              cursor: z.string().optional().nullable(), // ISO timestamp
              filters: z.any().optional().nullable(),
            })
            .passthrough(),
          z.undefined(),
          z.null(),
        ])
        .optional()
        .nullable()
    )
    .query(async ({ ctx, input }) => {
      try {
        const userId = (ctx as any)?.user?.id || (ctx as any)?.session?.user?.id || null;
        if (!userId) {
          return {
            notifications: [],
            unreadCount: 0,
            items: [],
            count: 0,
            nextCursor: null,
          };
        }

        let items: any[] = [];
        let hasMore = false;
        const rawInput = input as any;
        const limit = rawInput?.limit ?? 20;
        const cursor = rawInput?.cursor;
        const filters = rawInput?.filters;

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
          // Also fetch recent unread chat messages from 'messages' table
          try {
            const { data: unreadMsgs } = await supabase
              .from('messages')
              .select('*')
              .eq('receiver_id', userId)
              .eq('is_read', false)
              .order('created_at', { ascending: false })
              .limit(limit);

            if (unreadMsgs && unreadMsgs.length > 0) {
              const senderIds = Array.from(new Set(unreadMsgs.map((m: any) => m.sender_id).filter(Boolean)));
              const senderMap = new Map<string, any>();
              if (senderIds.length > 0) {
                const { data: senders } = await supabase
                  .from('profiles')
                  .select('id, first_name, last_name, full_name, artist_name, email')
                  .in('id', senderIds);
                (senders || []).forEach((s: any) => senderMap.set(s.id, s));
              }

              const chatNotifs = unreadMsgs.map((m: any) => {
                const s = senderMap.get(m.sender_id);
                const sName = [s?.first_name, s?.last_name].filter(Boolean).join(' ').trim() || s?.full_name || s?.artist_name || s?.email?.split('@')[0] || 'Someone';
                const contentPreview = m.content && m.content.length > 70 ? m.content.substring(0, 70) + '...' : (m.content || 'New chat message');
                return {
                  id: `msg-${m.id}`,
                  userId: userId,
                  type: 'MESSAGE_RECEIVED' as const,
                  message: `${sName}: ${contentPreview}`,
                  link: '/dashboard?tab=messages',
                  read: false,
                  createdAt: m.created_at || new Date().toISOString(),
                };
              });

              items = [...chatNotifs, ...items];
            }
          } catch (chatFetchErr) {
            console.warn('Error fetching unread chat messages for notifications:', chatFetchErr);
          }
        } catch (adminClientErr) {
          console.warn('Supabase client error in getNotifications:', adminClientErr);
        }

        const nextCursor =
          hasMore && items.length > 0
            ? items[items.length - 1]?.createdAt || items[items.length - 1]?.created_at || null
            : null;

        return {
          notifications: items,
          unreadCount: items.filter((n: any) => !n.read).length,
          items: items,
          count: items.length,
          nextCursor,
        };
      } catch (err) {
        console.error('getNotifications error caught gracefully:', err);
        return {
          notifications: [],
          unreadCount: 0,
          items: [],
          count: 0,
          nextCursor: null,
        };
      }
    }),

  markAsRead: publicProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = (ctx as any).user?.id || ctx.session?.user?.id;
        if (!userId) return { success: false };
        const supabase = createAdminClient();

        if (input.notificationId.startsWith('msg-')) {
          const msgId = input.notificationId.replace('msg-', '');
          await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', msgId)
            .eq('receiver_id', userId);
          return { success: true };
        }

        await supabase
          .from('Notification')
          .update({ read: true })
          .eq('id', input.notificationId)
          .eq('userId', userId);

        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', input.notificationId)
          .eq('user_id', userId);

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

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

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
        const userId = (ctx as any)?.user?.id || (ctx as any)?.session?.user?.id || null;
        if (!userId) {
          return { notifications: [], unreadCount: 0, count: 0 };
        }

        let notifCount = 0;
        let msgCount = 0;
        try {
          const supabase = createAdminClient();

          try {
            const { count: c, error } = await supabase
              .from('Notification')
              .select('*', { count: 'exact', head: true })
              .eq('userId', userId)
              .eq('read', false);

            if (!error && typeof c === 'number') {
              notifCount = c;
            }
          } catch {}

          if (notifCount === 0) {
            try {
              const { count: c, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false);

              if (!error && typeof c === 'number') {
                notifCount = c;
              }
            } catch {}
          }

          // Count unread chat messages
          try {
            const { count: mc, error } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('receiver_id', userId)
              .eq('is_read', false);

            if (!error && typeof mc === 'number') {
              msgCount = mc;
            }
          } catch {}
        } catch (e) {
          console.warn('Supabase admin client error in getUnreadNotificationCount:', e);
        }

        const totalCount = notifCount + msgCount;
        return { notifications: [], unreadCount: totalCount, count: totalCount };
      } catch (err) {
        console.error('getUnreadNotificationCount error caught gracefully:', err);
        return { notifications: [], unreadCount: 0, count: 0 };
      }
    }),

  getUnreadCount: publicProcedure
    .input(z.any().optional().nullable())
    .query(async ({ ctx }) => {
      try {
        const userId = (ctx as any)?.user?.id || (ctx as any)?.session?.user?.id || null;
        if (!userId) {
          return { notifications: [], unreadCount: 0, count: 0 };
        }

        let notifCount = 0;
        let msgCount = 0;
        try {
          const supabase = createAdminClient();

          try {
            const { count: c, error } = await supabase
              .from('Notification')
              .select('*', { count: 'exact', head: true })
              .eq('userId', userId)
              .eq('read', false);

            if (!error && typeof c === 'number') {
              notifCount = c;
            }
          } catch {}

          if (notifCount === 0) {
            try {
              const { count: c, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false);

              if (!error && typeof c === 'number') {
                notifCount = c;
              }
            } catch {}
          }

          // Count unread chat messages
          try {
            const { count: mc, error } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('receiver_id', userId)
              .eq('is_read', false);

            if (!error && typeof mc === 'number') {
              msgCount = mc;
            }
          } catch {}
        } catch (e) {
          console.warn('Supabase admin client error in getUnreadCount:', e);
        }

        const totalCount = notifCount + msgCount;
        return { notifications: [], unreadCount: totalCount, count: totalCount };
      } catch (err) {
        console.error('getUnreadCount error caught gracefully:', err);
        return { notifications: [], unreadCount: 0, count: 0 };
      }
    }),

  unreadCount: publicProcedure
    .input(z.any().optional().nullable())
    .query(async ({ ctx }) => {
      try {
        const userId = (ctx as any)?.user?.id || (ctx as any)?.session?.user?.id || null;
        if (!userId) {
          return { notifications: [], unreadCount: 0, count: 0 };
        }
        const supabase = createAdminClient();
        let notifCount = 0;
        let msgCount = 0;
        try {
          const { count: c } = await supabase.from('Notification').select('*', { count: 'exact', head: true }).eq('userId', userId).eq('read', false);
          if (typeof c === 'number') notifCount = c;
        } catch {}
        try {
          const { count: mc } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', userId).eq('is_read', false);
          if (typeof mc === 'number') msgCount = mc;
        } catch {}
        const total = notifCount + msgCount;
        return { notifications: [], unreadCount: total, count: total };
      } catch {
        return { notifications: [], unreadCount: 0, count: 0 };
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
