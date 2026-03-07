'use client';

import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useRealtimeNotifications } from './useRealtimeNotifications';
import { useNotificationTitle } from './useNotificationTitle';

interface UseNotificationsOptions {
  limit?: number;
  enabled?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { limit = 10, enabled = true } = options;
  const utils = trpc.useUtils();
  const { data } = useAuth();
  const session = data?.session;

  // Enable real-time notifications
  useRealtimeNotifications(session?.user?.id);

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = trpc.notifications.getNotifications.useQuery(
    { limit },
    {
      enabled,
    }
  );

  const notifications = notificationsData?.notifications || [];

  // Fetch unread count
  const { data: unreadCount } = trpc.notifications.getUnreadNotificationCount.useQuery(
    undefined,
    {
      enabled,
    }
  );

  // Update browser tab title with unread count
  useNotificationTitle(unreadCount || 0);

  // Mark single notification as read
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onMutate: async ({ notificationId }) => {
      // Cancel outgoing refetches
      await utils.notifications.getNotifications.cancel();
      await utils.notifications.getUnreadNotificationCount.cancel();

      // Snapshot previous values
      const previousNotifications = utils.notifications.getNotifications.getData();
      const previousCount = utils.notifications.getUnreadNotificationCount.getData();

      // Optimistically update notifications
      utils.notifications.getNotifications.setData({ limit }, (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((notif) =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          ),
        };
      });

      // Optimistically update count
      if (previousCount !== undefined && previousCount > 0) {
        utils.notifications.getUnreadNotificationCount.setData(
          undefined,
          previousCount - 1
        );
      }

      return { previousNotifications, previousCount };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        utils.notifications.getNotifications.setData(
          { limit },
          context.previousNotifications
        );
      }
      if (context?.previousCount !== undefined) {
        utils.notifications.getUnreadNotificationCount.setData(
          undefined,
          context.previousCount
        );
      }
      toast.error('Failed to mark as read', { description: error.message });
    },
    onSettled: () => {
      // Refetch to ensure consistency
      utils.notifications.getNotifications.invalidate();
      utils.notifications.getUnreadNotificationCount.invalidate();
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onMutate: async () => {
      // Cancel outgoing refetches
      await utils.notifications.getNotifications.cancel();
      await utils.notifications.getUnreadNotificationCount.cancel();

      // Snapshot previous values
      const previousNotifications = utils.notifications.getNotifications.getData();
      const previousCount = utils.notifications.getUnreadNotificationCount.getData();

      // Optimistically update all notifications to read
      utils.notifications.getNotifications.setData({ limit }, (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((notif) => ({ ...notif, read: true })),
        };
      });

      // Optimistically set count to 0
      utils.notifications.getUnreadNotificationCount.setData(undefined, 0);

      return { previousNotifications, previousCount };
    },
    onSuccess: () => {
      toast.success('All notifications marked as read');
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        utils.notifications.getNotifications.setData(
          { limit },
          context.previousNotifications
        );
      }
      if (context?.previousCount !== undefined) {
        utils.notifications.getUnreadNotificationCount.setData(
          undefined,
          context.previousCount
        );
      }
      toast.error('Failed to mark all as read', { description: error.message });
    },
    onSettled: () => {
      // Refetch to ensure consistency
      utils.notifications.getNotifications.invalidate();
      utils.notifications.getUnreadNotificationCount.invalidate();
    },
  });

  return {
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
    isLoading,
    error,
    refetch,
    markAsRead: (notificationId: string) =>
      markAsReadMutation.mutate({ notificationId }),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    isMarkingRead: markAsReadMutation.isPending,
    isMarkingAllRead: markAllAsReadMutation.isPending,
  };
}
