'use client';

import { Bell, MessageSquare } from 'lucide-react';
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
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5 text-slate-700 dark:text-slate-200" />
          {hasUnreadNotifications && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-[#A2694E] rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md animate-in zoom-in-75">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-96 max-w-[calc(100vw-2rem)] p-0 bg-white dark:bg-[#1E1B18] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden text-slate-900 dark:text-white"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Notifications</h3>
            {hasUnreadNotifications && (
              <span className="px-2 py-0.5 bg-[#A2694E] text-white text-xs rounded-full font-bold">
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
              className="text-xs text-[#A2694E] dark:text-[#C58B6F] hover:text-[#8B5A3C] hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[440px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
          {isLoading && (
            <div className="p-4 space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2.5" />
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
                No notifications yet
              </p>
            </div>
          )}

          {!isLoading && notifications.length > 0 && (
            <div>
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
        <div className="p-2.5 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 flex items-center justify-between gap-2">
          <Link href="/dashboard?tab=messages" className="flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5 text-[#A2694E] dark:text-[#C58B6F]" />
              <span>Open Chat</span>
            </Button>
          </Link>
          <Link href="/notifications" className="flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-[#A2694E] dark:text-[#C58B6F] hover:text-[#8B5A3C] hover:bg-slate-200/60 dark:hover:bg-white/10"
            >
              View All
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
