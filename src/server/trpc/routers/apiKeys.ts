import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { router, protectedProcedure } from '../trpc';
import { generateApiKey } from '@/lib/api/auth';
import { TRPCError } from '@trpc/server';
import { getUserFeaturePermissions } from '@/lib/feature-enforcement';

interface ApiRequestLogRecord {
  endpoint: string;
  statusCode: number;
  responseTime?: number | null;
}

const isApiRequestLogRecord = (value: unknown): value is ApiRequestLogRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.endpoint === 'string' && typeof record.statusCode === 'number';
};

// Helper to check if user has API key access (Business or Enterprise)
async function requireApiKeyAccess(userId: string) {
  const permissions = await getUserFeaturePermissions(userId);
  if (!permissions.hasTeamCollaboration) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'API access requires Business or Enterprise plan',
    });
  }
}

export const apiKeysRouter = router({
  // List all API keys for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    await requireApiKeyAccess(ctx.session.user.id);
    const supabase = await createClient();
    const { data: apiKeys, error } = await supabase
      .from('ApiKey')
      .select('*')
      .eq('userId', ctx.session.user.id)
      .is('revokedAt', null)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch API keys',
      });
    }

    return apiKeys;
  }),

  // Create new API key
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        scopes: z.array(z.string()).min(1),
        expiresInDays: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireApiKeyAccess(ctx.session.user.id);
      const supabase = await createClient();

      // Generate API key
      const { key, keyHash, keyPrefix } = await generateApiKey();

      // Calculate expiration date if specified
      let expiresAt = null;
      if (input.expiresInDays) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + input.expiresInDays);
        expiresAt = expiry.toISOString();
      }

      // Store in database
      const { data: apiKeyRecord, error } = await supabase
        .from('ApiKey')
        .insert({
          userId: ctx.session.user.id,
          name: input.name,
          keyHash,
          keyPrefix,
          scopes: input.scopes,
          expiresAt,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create API key',
        });
      }

      // Return the full key (only time it's shown)
      return {
        ...apiKeyRecord,
        key, // Full key only returned on creation
      };
    }),

  // Revoke API key
  revoke: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireApiKeyAccess(ctx.session.user.id);
      const supabase = await createClient();

      // Verify ownership
      const { data: apiKey, error: fetchError } = await supabase
        .from('ApiKey')
        .select('*')
        .eq('id', input.id)
        .eq('userId', ctx.session.user.id)
        .single();

      if (fetchError || !apiKey) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found',
        });
      }

      // Mark as revoked
      const { error } = await supabase
        .from('ApiKey')
        .update({ revokedAt: new Date().toISOString() })
        .eq('id', input.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to revoke API key',
        });
      }

      return { success: true };
    }),

  // Get API key usage stats
  getUsage: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        days: z.number().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireApiKeyAccess(ctx.session.user.id);
      const supabase = await createClient();

      // Verify ownership
      const { data: apiKey, error: fetchError } = await supabase
        .from('ApiKey')
        .select('*')
        .eq('id', input.id)
        .eq('userId', ctx.session.user.id)
        .single();

      if (fetchError || !apiKey) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found',
        });
      }

      // Get request logs
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const { data: logs, error } = await supabase
        .from('ApiRequestLog')
        .select('*')
        .eq('apiKeyId', input.id)
        .gte('createdAt', startDate.toISOString())
        .order('createdAt', { ascending: false });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch usage data',
        });
      }

      // Calculate stats
      const requestLogs = Array.isArray(logs) ? logs.filter(isApiRequestLogRecord) : [];

      const totalRequests = requestLogs.length;
      const successfulRequests = requestLogs.filter((log) => log.statusCode >= 200 && log.statusCode < 300).length;
      const failedRequests = requestLogs.filter((log) => log.statusCode >= 400).length;
      const avgResponseTime = totalRequests > 0
        ? requestLogs.reduce((sum, log) => sum + (log.responseTime ?? 0), 0) / totalRequests
        : 0;

      const endpointAggregates = requestLogs.reduce<Record<string, { count: number; totalResponseTime: number }>>(
        (acc, log) => {
          const endpointKey = log.endpoint;
          if (!acc[endpointKey]) {
            acc[endpointKey] = { count: 0, totalResponseTime: 0 };
          }
          acc[endpointKey].count += 1;
          acc[endpointKey].totalResponseTime += log.responseTime ?? 0;
          return acc;
        },
        {}
      );

      const endpointStats = Object.fromEntries(
        Object.entries(endpointAggregates).map(([endpoint, { count, totalResponseTime }]) => [
          endpoint,
          {
            count,
            avgResponseTime: count > 0 ? totalResponseTime / count : 0,
          },
        ])
      );

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        avgResponseTime,
        endpointStats,
        recentRequests: requestLogs.slice(0, 10),
      };
    }),
});
