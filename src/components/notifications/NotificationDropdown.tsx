'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationItem } from './NotificationItem';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  className?: string;
  variant?: 'ghost' | 'default';
  size?: 'sm' | 'default';
}

export function NotificationDropdown({
  className,
  variant = 'ghost',
  size = 'sm',
}: NotificationDropdownProps) {
  const { data } = useAuth();
  const session = data?.session;
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAllRead,
  } = useNotifications({
    limit: 10,
    enabled: !!session,
  });

  if (!session) {
    return null;
  }

  const hasUnreadNotifications = unreadCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            'relative text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors',
            className
          )}
        >
          <Bell className="h-5 w-5 text-slate-700 dark:text-slate-200" />
          {hasUnreadNotifications && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-96 max-w-[calc(100vw-2rem)] p-0 bg-gray-900 border-white/10"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">Notifications</h3>
            {hasUnreadNotifications && (
              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {hasUnreadNotifications && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={isMarkingAllRead}
              className="text-xs text-blue-400 hover:text-blue-300 hover:bg-white/5"
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[480px] overflow-y-auto">
          {isLoading && (
            <div className="p-4 space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-12 w-12 text-gray-600 mb-3" />
              <p className="text-sm text-gray-400 text-center">
                No notifications yet
              </p>
            </div>
          )}

          {!isLoading && notifications.length > 0 && (
            <div className="divide-y divide-white/5">
              {notifications.map((notification: any) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  variant="dropdown"
                  onMarkRead={markAsRead}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-white/10">
            <Link href="/notifications" className="block">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-blue-400 hover:text-blue-300 hover:bg-white/5"
              >
                View All Notifications
              </Button>
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
