import type { Notification } from '@/types/database.types';

export interface NotificationGroup {
  id: string;
  type: 'single' | 'grouped';
  count: number;
  summary: string;
  notifications: Notification[];
  latestTimestamp: Date;
  groupKey?: string;
  isExpanded?: boolean;
}

const GROUPING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export function groupNotifications(notifications: Notification[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  const now = Date.now();

  // Sort by createdAt DESC (should already be sorted from query)
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const grouped = new Map<string, Notification[]>();

  for (const notification of sorted) {
    const timestamp = new Date(notification.createdAt).getTime();
    const isRecent = now - timestamp < GROUPING_WINDOW_MS;

    if (!isRecent) {
      // Don't group old notifications
      groups.push({
        id: notification.id,
        type: 'single',
        count: 1,
        summary: notification.message,
        notifications: [notification],
        latestTimestamp: new Date(notification.createdAt),
      });
      continue;
    }

    // Generate group key based on type and related entity
    let groupKey: string | null = null;

    if (notification.type === 'PROPOSAL_RECEIVED' && notification.link) {
      // Group by job (extract jobId from link)
      const match = notification.link.match(/\/jobs\/([^/?]+)/);
      if (match) {
        groupKey = `PROPOSAL_RECEIVED:${match[1]}`;
      }
    } else if (
      ['MILESTONE_FUNDED', 'MILESTONE_SUBMITTED', 'MILESTONE_COMPLETED'].includes(
        notification.type
      )
    ) {
      // Group by contract (extract from link)
      const match = notification.link?.match(/\/contracts\/([^/?]+)/);
      if (match) {
        groupKey = `${notification.type}:${match[1]}`;
      }
    } else if (
      ['VERIFICATION_APPROVED', 'VERIFICATION_REJECTED'].includes(
        notification.type
      )
    ) {
      // Don't group verification notifications - each is a distinct event
      groupKey = null;
    }

    if (groupKey) {
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(notification);
    } else {
      // Single notification
      groups.push({
        id: notification.id,
        type: 'single',
        count: 1,
        summary: notification.message,
        notifications: [notification],
        latestTimestamp: new Date(notification.createdAt),
      });
    }
  }

  // Convert grouped Map to groups array
  for (const [groupKey, notificationList] of grouped.entries()) {
    if (notificationList.length === 1) {
      // Single item, don't group
      const notification = notificationList[0];
      groups.push({
        id: notification.id,
        type: 'single',
        count: 1,
        summary: notification.message,
        notifications: notificationList,
        latestTimestamp: new Date(notification.createdAt),
      });
    } else {
      // Multiple items, create group
      const latest = notificationList[0];
      let summary = '';

      if (latest.type === 'PROPOSAL_RECEIVED') {
        const jobTitle = latest.message.match(/for (.+)$/)?.[1] || 'this job';
        summary = `${notificationList.length} new proposals for ${jobTitle}`;
      } else if (latest.type === 'MILESTONE_FUNDED') {
        summary = `${notificationList.length} milestones funded`;
      } else if (latest.type === 'MILESTONE_SUBMITTED') {
        summary = `${notificationList.length} milestones submitted`;
      } else if (latest.type === 'MILESTONE_COMPLETED') {
        summary = `${notificationList.length} milestones completed`;
      } else if (latest.type === 'VERIFICATION_APPROVED') {
        summary = `${notificationList.length} verification approvals`;
      } else if (latest.type === 'VERIFICATION_REJECTED') {
        summary = `${notificationList.length} verification rejections`;
      } else {
        summary = `${notificationList.length} notifications`;
      }

      groups.push({
        id: groupKey,
        type: 'grouped',
        count: notificationList.length,
        summary,
        notifications: notificationList,
        latestTimestamp: new Date(latest.createdAt),
        groupKey,
        isExpanded: false,
      });
    }
  }

  // Sort groups by latest timestamp
  groups.sort((a, b) => b.latestTimestamp.getTime() - a.latestTimestamp.getTime());

  return groups;
}
