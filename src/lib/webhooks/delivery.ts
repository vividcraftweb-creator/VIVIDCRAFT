import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

/**
 * Webhook event types
 */
export type WebhookEvent =
  | 'proposal.submitted'
  | 'proposal.accepted'
  | 'proposal.rejected'
  | 'contract.signed'
  | 'contract.completed'
  | 'contract.terminated'
  | 'milestone.completed'
  | 'payment.released'
  | 'job.created'
  | 'job.closed'
  | 'job.reopened';

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Send webhook to all subscribed endpoints
 */
export async function sendWebhook(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();

    // Find all active webhook endpoints for this user subscribed to this event
    const { data: endpoints } = await supabase
      .from('WebhookEndpoint')
      .select('*')
      .eq('userId', userId)
      .eq('isActive', true)
      .contains('events', [event]);

    if (!endpoints || endpoints.length === 0) {
      return;
    }

    // Prepare payload
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data
    };

    // Send to each endpoint
    for (const endpoint of endpoints) {
      await queueWebhookDelivery({
        endpointId: endpoint.id,
        url: endpoint.url,
        secret: endpoint.secret,
        payload
      });
    }

  } catch (error) {
    // Webhook sending failed silently
  }
}

interface WebhookDelivery {
  endpointId: string;
  url: string;
  secret: string;
  payload: WebhookPayload;
}

async function queueWebhookDelivery(delivery: WebhookDelivery): Promise<void> {
  try {
    const supabase = await createClient();

    // Create signature for security (HMAC SHA256)
    const signature = crypto
      .createHmac('sha256', delivery.secret)
      .update(JSON.stringify(delivery.payload))
      .digest('hex');

    // Log delivery attempt
    const { data: deliveryRecord, error: insertError } = await supabase
      .from('WebhookDelivery')
      .insert({
        endpointId: delivery.endpointId,
        event: delivery.payload.event,
        payload: delivery.payload,
        attemptCount: 1,
        createdAt: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      return;
    }

    // Attempt immediate delivery
    await attemptWebhookDelivery(
      deliveryRecord.id,
      delivery.url,
      delivery.payload,
      signature
    );
  } catch (error) {
    // Webhook queueing failed silently
  }
}

async function attemptWebhookDelivery(
  deliveryId: string,
  url: string,
  payload: WebhookPayload,
  signature: string
): Promise<void> {
  const supabase = await createClient();

  try {
    // Send HTTP POST request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VividArt-Signature': `sha256=${signature}`,
        'X-VividArt-Event': payload.event,
        'User-Agent': 'VividArt-Webhooks/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const responseBody = await response.text();

    // Update delivery record
    const { data: delivery } = await supabase
      .from('WebhookDelivery')
      .update({
        httpStatus: response.status,
        responseBody: responseBody.substring(0, 1000), // Store first 1000 chars
        deliveredAt: response.ok ? new Date().toISOString() : null
      })
      .eq('id', deliveryId)
      .select('endpointId')
      .single();

    // Update webhook endpoint lastUsedAt on successful delivery
    if (response.ok && delivery?.endpointId) {
      await supabase
        .from('WebhookEndpoint')
        .update({
          lastUsedAt: new Date().toISOString()
        })
        .eq('id', delivery.endpointId);
    }

    // If failed, schedule retry
    if (!response.ok) {
      await scheduleWebhookRetry(deliveryId);
    }

  } catch (error: unknown) {
    // Schedule retry on failure
    await scheduleWebhookRetry(deliveryId);
  }
}

/**
 * Schedule webhook retry with exponential backoff
 */
async function scheduleWebhookRetry(deliveryId: string): Promise<void> {
  const supabase = await createClient();

  const { data: delivery } = await supabase
    .from('WebhookDelivery')
    .select('*')
    .eq('id', deliveryId)
    .single();

  const deliveryRecord = delivery as { attemptCount?: number } | null;

  if (!deliveryRecord) {
    return;
  }

  // Max 5 retries
  const attemptCount = typeof deliveryRecord.attemptCount === 'number' ? deliveryRecord.attemptCount : 0;

  if (attemptCount >= 5) {
    return;
  }

  // Exponential backoff: 1min, 5min, 30min, 2hr, 12hr
  const delays = [60, 300, 1800, 7200, 43200]; // in seconds
  const nextRetryIn = delays[Math.max(attemptCount - 1, 0)] || 43200;
  const nextRetryAt = new Date(Date.now() + nextRetryIn * 1000);

  await supabase
    .from('WebhookDelivery')
    .update({
      nextRetryAt: nextRetryAt.toISOString(),
      attemptCount: attemptCount + 1
    })
    .eq('id', deliveryId);

  // In production, you would use a job queue like BullMQ
  // For now, we'll just log the scheduled retry
}

/**
 * Retry failed webhook deliveries (cron job)
 */
export async function retryFailedWebhooks(): Promise<void> {
  const supabase = await createClient();

  // Find deliveries due for retry
  const { data: deliveries } = await supabase
    .from('WebhookDelivery')
    .select('*, endpoint:WebhookEndpoint(*)')
    .is('deliveredAt', null)
    .lte('nextRetryAt', new Date().toISOString())
    .lt('attemptCount', 5);

  if (!deliveries || deliveries.length === 0) {
    return;
  }

  for (const delivery of deliveries) {
    if (!delivery.endpoint) {
      continue;
    }

    // Create new signature
    const signature = crypto
      .createHmac('sha256', delivery.endpoint.secret)
      .update(JSON.stringify(delivery.payload))
      .digest('hex');

    await attemptWebhookDelivery(
      delivery.id,
      delivery.endpoint.url,
      delivery.payload as WebhookPayload,
      signature
    );
  }
}
