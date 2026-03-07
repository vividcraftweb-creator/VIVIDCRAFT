'use client';

import { useMemo, useEffect } from 'react';
import { NotificationIcon } from './NotificationIcon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { Notification } from '@/types/database.types';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
  variant?: 'dropdown' | 'full';
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onMarkRead?: (id: string) => void;
  isMarkingRead?: boolean;
}

export function NotificationItem({
  notification,
  variant = 'full',
  selectable = false,
  selected = false,
  onSelect,
  onMarkRead,
  isMarkingRead = false,
}: NotificationItemProps) {
  const router = useRouter();
  const isDropdown = variant === 'dropdown';

  const handleClick = () => {
    // Don't navigate if in selection mode
    if (selectable) return;

    // Mark as read if unread
    if (!notification.read && onMarkRead) {
      onMarkRead(notification.id);
    }

    // Navigate to link if present
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkRead) {
      onMarkRead(notification.id);
    }
  };

  const handleSelectChange = (checked: boolean) => {
    if (onSelect) {
      onSelect(notification.id);
    }
  };

  // Parse ISO timestamp correctly to avoid timezone issues
  const createdAtDate = useMemo(() => {
    let timestampString = notification.createdAt;

    // Fix: If timestamp is missing 'Z' suffix, add it to ensure UTC parsing
    if (typeof timestampString === 'string' && !timestampString.endsWith('Z') && !timestampString.includes('+')) {
      timestampString = timestampString + 'Z';
    }

    const date = typeof timestampString === 'string'
      ? parseISO(timestampString)
      : new Date(timestampString);

    // Validate date
    if (isNaN(date.getTime())) {
      return new Date(); // Fallback to now
    }

    return date;
  }, [notification.createdAt]);

  const timeAgo = useMemo(() => {
    return formatDistanceToNow(createdAtDate, {
      addSuffix: true,
    });
  }, [createdAtDate]);

  if (isDropdown) {
    // Compact variant for dropdown
    return (
      <div
        onClick={handleClick}
        className={cn(
          'p-3 flex items-start gap-3 cursor-pointer transition-colors',
          !notification.read && 'bg-blue-500/10',
          !selectable && 'hover:bg-white/5'
        )}
      >
        <NotificationIcon type={notification.type} size={20} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white line-clamp-2">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
        </div>
        {!notification.read && (
          <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
        )}
      </div>
    );
  }

  // Full variant for notifications page
  return (
    <div
      className={cn(
        'p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        notification.read ? 'bg-secondary/50' : 'bg-secondary'
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
        {selectable && (
          <Checkbox
            checked={selected}
            onCheckedChange={handleSelectChange}
            className="mt-1"
          />
        )}
        <NotificationIcon
          type={notification.type}
          size={20}
          className="flex-shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base break-words">{notification.message}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {createdAtDate.toLocaleString()} ({timeAgo})
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 sm:flex-shrink-0">
        {notification.link && (
          <Link href={notification.link} passHref className="flex-1 sm:flex-initial">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              View
            </Button>
          </Link>
        )}
        {!notification.read && !selectable && (
          <Button
            variant="default"
            size="sm"
            onClick={handleMarkAsRead}
            disabled={isMarkingRead}
            className="flex-1 sm:flex-initial whitespace-nowrap"
          >
            Mark as Read
          </Button>
        )}
      </div>
    </div>
  );
}
