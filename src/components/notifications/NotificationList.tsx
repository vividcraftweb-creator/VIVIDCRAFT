'use client';

import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/utils/trpc';
import { NotificationItem } from './NotificationItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bell, Loader2, Trash2, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { groupNotifications } from '@/lib/notifications/grouping';
import { NotificationGroup } from './NotificationGroup';
import type { FilterState } from './NotificationFilters';

interface NotificationListProps {
  filters: FilterState;
  onMarkRead?: (id: string) => void;
  selectionEnabled?: boolean;
  groupingEnabled?: boolean;
}

export function NotificationList({ filters, onMarkRead, selectionEnabled = false, groupingEnabled = true }: NotificationListProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const utils = trpc.useUtils();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = (trpc.notifications.getNotifications as any).useInfiniteQuery(
    {
      limit: 20,
      filters: {
        types: filters.types.length > 0 ? filters.types : undefined,
        read: filters.read,
        searchQuery: filters.searchQuery || undefined,
      },
    },
    {
      getNextPageParam: (lastPage: any) => lastPage?.nextCursor ?? undefined,
    }
  );

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const allNotifications: any[] =
    data?.pages?.flatMap((page: any) =>
      Array.isArray(page) ? page : page?.notifications || []
    ) || [];
  const groupedNotifications = groupingEnabled
    ? groupNotifications(allNotifications)
    : allNotifications.map((n: any) => ({
        id: n.id,
        type: 'single' as const,
        count: 1,
        summary: n.message,
        notifications: [n],
        latestTimestamp: new Date(n.createdAt),
      }));

  // Bulk action mutations
  const markManyAsReadMutation = trpc.notifications.markManyAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getNotifications.invalidate();
      utils.notifications.getUnreadNotificationCount.invalidate();
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} notifications marked as read`);
    },
    onError: (error) => {
      toast.error('Failed to mark as read', { description: error.message });
    },
  });

  const deleteManyMutation = trpc.notifications.deleteMany.useMutation({
    onSuccess: () => {
      utils.notifications.getNotifications.invalidate();
      utils.notifications.getUnreadNotificationCount.invalidate();
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} notifications deleted`);
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error('Failed to delete notifications', { description: error.message });
    },
  });

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === allNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allNotifications.map((n) => n.id)));
    }
  };

  const handleMarkSelectedAsRead = () => {
    if (selectedIds.size > 0) {
      markManyAsReadMutation.mutate({ notificationIds: Array.from(selectedIds) });
    }
  };

  const handleDeleteSelected = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedIds.size > 0) {
      deleteManyMutation.mutate({ notificationIds: Array.from(selectedIds) });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (allNotifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Bell className="h-12 w-12 text-gray-600 mb-3" />
        <p className="text-center text-muted-foreground text-sm sm:text-base">
          {filters.types.length > 0 || filters.read !== undefined || filters.searchQuery
            ? 'No notifications match your filters.'
            : 'You have no notifications.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Bulk Action Bar */}
      {selectionEnabled && selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-white">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkSelectedAsRead}
              disabled={markManyAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark as Read
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={deleteManyMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Select All Button */}
      {selectionEnabled && allNotifications.length > 0 && (
        <div className="mb-4">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {selectedIds.size === allNotifications.length ? 'Deselect All' : 'Select All Visible'}
          </Button>
        </div>
      )}

      <div className="space-y-3 sm:space-y-4">
        {groupedNotifications.map((group) => (
          <NotificationGroup
            key={group.id}
            group={group}
            onMarkRead={onMarkRead || (() => {})}
            selectable={selectionEnabled}
            selectedIds={selectedIds}
            onSelect={handleSelect}
          />
        ))}

        {/* Intersection Observer Target */}
        <div ref={observerTarget} className="h-4" />

        {/* Loading More Indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        )}

        {/* Load More Button (Fallback) */}
        {hasNextPage && !isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              Load More
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} notification{selectedIds.size > 1 ? 's' : ''}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
