'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NotificationItem } from './NotificationItem';
import { NotificationIcon } from './NotificationIcon';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { NotificationGroup as NotificationGroupType } from '@/lib/notifications/grouping';

interface NotificationGroupProps {
  group: NotificationGroupType;
  onMarkRead: (id: string) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
}

export function NotificationGroup({
  group,
  onMarkRead,
  selectable = false,
  selectedIds = new Set(),
  onSelect,
}: NotificationGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (group.type === 'single') {
    return (
      <NotificationItem
        notification={group.notifications[0]}
        onMarkRead={onMarkRead}
        selectable={selectable}
        selected={selectedIds.has(group.notifications[0].id)}
        onSelect={onSelect}
      />
    );
  }

  const timeAgo = formatDistanceToNow(group.latestTimestamp, { addSuffix: true });
  const hasUnread = group.notifications.some((n) => !n.read);

  return (
    <div
      className={cn(
        'border rounded-lg transition-colors',
        hasUnread ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/10 bg-white/5'
      )}
    >
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <NotificationIcon
            type={group.notifications[0].type}
            size={20}
            className="flex-shrink-0"
          />
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm text-white font-medium">{group.summary}</p>
            <p className="text-xs text-gray-400">{timeAgo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
            {group.count}
          </Badge>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform text-gray-400',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/10">
          {group.notifications.map((notification) => (
            <div key={notification.id} className="border-b border-white/5 last:border-b-0">
              <NotificationItem
                notification={notification}
                variant="full"
                onMarkRead={onMarkRead}
                selectable={selectable}
                selected={selectedIds.has(notification.id)}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
