import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import crypto from 'crypto';
import { getUserFeaturePermissions } from '@/lib/feature-enforcement';

// Helper to check if user has webhook access (Business or Enterprise)
async function requireWebhookAccess(userId: string) {
  const permissions = await getUserFeaturePermissions(userId);
  if (!permissions.hasTeamCollaboration) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Webhooks require Business or Enterprise plan',
    });
  }
}

export const webhooksRouter = router({
  // List all webhook endpoints
  list: protectedProcedure.query(async ({ ctx }) => {
    await requireWebhookAccess(ctx.session.user.id);
    const supabase = await createClient();
    const { data: webhooks, error } = await supabase
      .from('WebhookEndpoint')
      .select('*')
      .eq('userId', ctx.session.user.id)
      .eq('isActive', true)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch webhooks',
      });
    }

    return webhooks;
  }),

  // Create webhook endpoint
  create: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        events: z.array(z.string()).min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireWebhookAccess(ctx.session.user.id);

      // Validate URL is HTTPS
      if (!input.url.startsWith('https://')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Webhook URL must use HTTPS',
        });
      }

      // Generate secret for HMAC signatures
      const supabase = await createClient();
      const secret = crypto.randomBytes(32).toString('hex');

      const { data: webhook, error } = await supabase
        .from('WebhookEndpoint')
        .insert({
          userId: ctx.session.user.id,
          url: input.url,
          events: input.events,
          secret,
          description: input.description,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create webhook',
        });
      }

      return { ...webhook, secret }; // Return secret only on creation
    }),

  // Update webhook
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        url: z.string().url().optional(),
        events: z.array(z.string()).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireWebhookAccess(ctx.session.user.id);

      const { id, ...updates } = input;
      const supabase = await createClient();

      // Verify ownership
      const { data: existing } = await supabase
        .from('WebhookEndpoint')
        .select('*')
        .eq('id', id)
        .eq('userId', ctx.session.user.id)
        .single();

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Webhook not found',
        });
      }

      const { error } = await supabase
        .from('WebhookEndpoint')
        .update({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update webhook',
        });
      }

      return { success: true };
    }),

  // Delete webhook
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireWebhookAccess(ctx.session.user.id);
      const supabase = await createClient();

      const { error } = await supabase
        .from('WebhookEndpoint')
        .delete()
        .eq('id', input.id)
        .eq('userId', ctx.session.user.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete webhook',
        });
      }

      return { success: true };
    }),

  // Test webhook endpoint
  test: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireWebhookAccess(ctx.session.user.id);
      const supabase = await createClient();

      const { data: webhook } = await supabase
        .from('WebhookEndpoint')
        .select('*')
        .eq('id', input.id)
        .eq('userId', ctx.session.user.id)
        .single();

      if (!webhook) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Webhook not found',
        });
      }

      // Send test payload
      const testPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from Vivid Art',
          webhook_id: webhook.id,
        },
      };

      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(testPayload))
        .digest('hex');

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-VividArt-Signature': `sha256=${signature}`,
            'X-VividArt-Event': 'webhook.test',
          },
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(5000),
        });

        const responseText = await response.text();

        return {
          success: response.ok,
          status: response.status,
          response: responseText.substring(0, 500),
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          success: false,
          status: 0,
          response: message,
        };
      }
    }),

  // Get delivery logs
  getLogs: protectedProcedure
    .input(
      z.object({
        webhookId: z.string(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireWebhookAccess(ctx.session.user.id);
      const supabase = await createClient();

      const { data: logs, error } = await supabase
        .from('WebhookDelivery')
        .select('*')
        .eq('endpointId', input.webhookId)
        .order('createdAt', { ascending: false })
        .limit(input.limit);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch delivery logs',
        });
      }

      return logs;
    }),
});
