'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Notification } from '@/types/database.types';
import { showDesktopNotification, getDesktopNotificationPermission } from '@/lib/notifications/desktop-notification';
import { toast } from 'sonner';

export function useRealtimeNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channelName = `realtime_user_notifications_${userId}`;

    const invalidateAllNotificationQueries = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: [['notifications', 'getNotifications']] });
      queryClient.invalidateQueries({ queryKey: [['notifications', 'getUnreadNotificationCount']] });
      queryClient.invalidateQueries({ queryKey: [['notifications', 'getUnreadCount']] });
      queryClient.invalidateQueries({ queryKey: [['notifications', 'unreadCount']] });
      queryClient.invalidateQueries({ queryKey: [['messages', 'getConversationPreviews']] });
      queryClient.invalidateQueries({ queryKey: [['messages', 'getConversations']] });
      queryClient.invalidateQueries({ queryKey: [['messages', 'getUnreadMessageCount']] });
    };

    const channel = supabase
      .channel(channelName)
      // 1. Listen for new chat messages sent to this user
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload: any) => {
          const newMsg = payload?.new;
          if (newMsg) {
            const preview = newMsg.content
              ? newMsg.content.length > 60
                ? newMsg.content.substring(0, 60) + '...'
                : newMsg.content
              : 'You have a new message';

            // In-app toast notification
            toast.info('New message received', {
              description: preview,
              action: {
                label: 'View',
                onClick: () => {
                  window.location.href = '/dashboard?tab=messages';
                },
              },
            });

            // Desktop notification if permitted
            if (getDesktopNotificationPermission() === 'granted') {
              showDesktopNotification({
                title: 'New Chat Message',
                body: preview,
                link: '/dashboard?tab=messages',
              });
            }

            // Dispatch global event for active chat windows
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('chat-message-received', { detail: newMsg }));
            }
          }

          invalidateAllNotificationQueries();
        }
      )
      // 2. Listen for chat message updates (e.g., marked as read)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          invalidateAllNotificationQueries();
        }
      )
      // 3. Listen for chat message deletions
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          invalidateAllNotificationQueries();
        }
      )
      // 4. Listen for general notifications on public.Notification
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          const newNotification = payload.new as Notification;
          if (newNotification) {
            toast.info('New notification', {
              description: newNotification.message,
              action: newNotification.link
                ? {
                    label: 'View',
                    onClick: () => {
                      window.location.href = newNotification.link!;
                    },
                  }
                : undefined,
            });

            if (getDesktopNotificationPermission() === 'granted') {
              showDesktopNotification({
                title: 'New Notification',
                body: newNotification.message,
                link: newNotification.link || undefined,
              });
            }
          }

          invalidateAllNotificationQueries();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${userId}`,
        },
        () => {
          invalidateAllNotificationQueries();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${userId}`,
        },
        () => {
          invalidateAllNotificationQueries();
        }
      )
      // 5. Fallback listener for snake_case notifications table
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          invalidateAllNotificationQueries();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          invalidateAllNotificationQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
