'use client';

import { useState } from 'react';
import { useAuth as useSession } from '@/hooks/useAuth';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NotificationFilters, type FilterState } from '@/components/notifications/NotificationFilters';
import { NotificationList } from '@/components/notifications/NotificationList';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationsClient() {
  const { data: sessionData } = useSession();
  const session = sessionData?.session;
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    read: undefined,
    searchQuery: '',
  });

  const { unreadCount, markAsRead, markAllAsRead, isMarkingAllRead } = useNotifications({
    limit: 10,
    enabled: !!session,
  });

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
      <PageHeader title="Notifications" />

      <Card className="glass-card">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl">Your Notifications</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                A log of all your account activity.
              </CardDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                disabled={isMarkingAllRead}
                className="whitespace-nowrap"
              >
                Mark All as Read
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="mt-4">
            <NotificationFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <NotificationList filters={filters} onMarkRead={markAsRead} />
        </CardContent>
      </Card>
    </div>
  );
}
