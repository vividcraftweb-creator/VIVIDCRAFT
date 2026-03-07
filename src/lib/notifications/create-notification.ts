import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import crypto from 'crypto';

type NotificationType = Database['public']['Enums']['NotificationType'];

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  message: string;
  link?: string | null;
  read?: boolean;
}

interface CreateNotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

/**
 * Creates a notification in the database with guaranteed timestamp.
 *
 * This utility ensures that all notifications are created with consistent data,
 * including a proper createdAt timestamp. Using this function prevents the bug
 * where notifications showed incorrect "time ago" values.
 *
 * @param supabase - Supabase client instance
 * @param params - Notification parameters
 * @returns Result object with success status and notification ID
 *
 * @example
 * ```typescript
 * await createNotification(supabase, {
 *   userId: user.id,
 *   type: 'VERIFICATION_APPROVED',
 *   message: 'Your identity verification has been approved!',
 *   link: '/verification',
 * });
 * ```
 *
 * @example
 * ```typescript
 * const result = await createNotification(supabase, {
 *   userId: client.id,
 *   type: 'PROPOSAL_RECEIVED',
 *   message: `New proposal submitted for ${job.title}`,
 *   link: `/jobs/${jobSlug}`,
 *   read: false,
 * });
 *
 * if (!result.success) {
 *   // Handle error appropriately
 * }
 * ```
 */
export async function createNotification(
  supabase: SupabaseClient<Database>,
  params: CreateNotificationParams
): Promise<CreateNotificationResult> {
  try {
    const notificationId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const { error } = await supabase.from('Notification').insert({
      id: notificationId,
      userId: params.userId,
      type: params.type,
      message: params.message,
      link: params.link ?? null,
      read: params.read ?? false,
      createdAt, // Always included - this prevents the timestamp bug
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, notificationId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Creates multiple notifications in a single batch operation.
 * More efficient when sending notifications to multiple users.
 *
 * All notifications in the batch will have the same createdAt timestamp,
 * which is appropriate for events that trigger multiple notifications
 * simultaneously (e.g., contract creation notifying both client and freelancer).
 *
 * @param supabase - Supabase client instance
 * @param notifications - Array of notification parameters
 * @returns Result object with success status
 *
 * @example
 * ```typescript
 * await createNotificationBatch(supabase, [
 *   {
 *     userId: client.id,
 *     type: 'CONTRACT_STARTED',
 *     message: 'Contract has been created',
 *     link: `/contracts/${contractId}`,
 *   },
 *   {
 *     userId: freelancer.id,
 *     type: 'CONTRACT_STARTED',
 *     message: 'You have a new contract',
 *     link: `/contracts/${contractId}`,
 *   },
 * ]);
 * ```
 */
export async function createNotificationBatch(
  supabase: SupabaseClient<Database>,
  notifications: CreateNotificationParams[]
): Promise<CreateNotificationResult> {
  try {
    if (notifications.length === 0) {
      return { success: true };
    }

    const createdAt = new Date().toISOString();

    const insertData = notifications.map((params) => ({
      id: crypto.randomUUID(),
      userId: params.userId,
      type: params.type,
      message: params.message,
      link: params.link ?? null,
      read: params.read ?? false,
      createdAt,
    }));

    const { error } = await supabase.from('Notification').insert(insertData);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
