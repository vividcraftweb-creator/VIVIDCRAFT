/**
 * Admin Audit Logs Router
 * Handles audit log queries and management
 */

import { router, adminProcedure } from '../../trpc';
import type { Context } from '../../context';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const requireAdminSupabase = (ctx: Context) => {
  const supabase = ctx.adminSupabase;

  if (!supabase) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to initialize admin Supabase client.',
    });
  }

  return supabase;
};

export const adminAuditLogsRouter = router({
  /**
   * Get audit logs with filtering and pagination
   */
  getAuditLogs: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        entityType: z.string().optional(),
        action: z.string().optional(),
        userId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const supabase = ctx.adminSupabase;
        if (!supabase) {
          return { logs: [], total: 0, page: input.page, limit: input.limit, totalPages: 0 };
        }
        const { page, limit, entityType, action, userId, startDate, endDate } = input;

        const offset = (page - 1) * limit;

        // Build query
        let query = supabase
          .from('AuditLog')
          .select(
            `
            id,
            action,
            entityType,
            entityId,
            userId,
            ipAddress,
            userAgent,
            metadata,
            createdAt,
            user:User!AuditLog_userId_fkey(
              id,
              email,
              Profile(firstName, lastName)
            )
          `,
            { count: 'exact' }
          )
          .order('createdAt', { ascending: false });

        // Apply filters
        if (entityType) {
          query = query.eq('entityType', entityType);
        }
        if (action) {
          query = query.eq('action', action);
        }
        if (userId) {
          query = query.eq('userId', userId);
        }
        if (startDate) {
          query = query.gte('createdAt', startDate);
        }
        if (endDate) {
          query = query.lte('createdAt', endDate);
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data: logs, error, count } = await query;

        if (error) {
          console.error('getAuditLogs error:', error);
          return { logs: [], total: 0, page, limit, totalPages: 0 };
        }

        return {
          logs: logs || [],
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        };
      } catch (err) {
        console.error('getAuditLogs exception:', err);
        return { logs: [], total: 0, page: input.page, limit: input.limit, totalPages: 0 };
      }
    }),

  /**
   * Get audit log statistics
   */
  getStats: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) {
        return {
          totalLogs: 0,
          last24Hours: 0,
          topActions: [],
          topEntityTypes: [],
        };
      }

      // Get total logs count
      const { count: totalLogs } = await supabase
        .from('AuditLog')
        .select('*', { count: 'exact', head: true });

      // Get logs from last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: last24Hours } = await supabase
        .from('AuditLog')
        .select('*', { count: 'exact', head: true })
        .gte('createdAt', yesterday);

      // Get most common actions
      const { data: actions } = await supabase
        .from('AuditLog')
        .select('action');

      const actionCounts: Record<string, number> = {};
      actions?.forEach((log) => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      });

      const topActions = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }));

      // Get most common entity types
      const { data: entities } = await supabase
        .from('AuditLog')
        .select('entityType');

      const entityCounts: Record<string, number> = {};
      entities?.forEach((log) => {
        entityCounts[log.entityType] = (entityCounts[log.entityType] || 0) + 1;
      });

      const topEntityTypes = Object.entries(entityCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([entityType, count]) => ({ entityType, count }));

      return {
        totalLogs: totalLogs || 0,
        last24Hours: last24Hours || 0,
        topActions,
        topEntityTypes,
      };
    } catch (err) {
      console.error('getStats exception:', err);
      return {
        totalLogs: 0,
        last24Hours: 0,
        topActions: [],
        topEntityTypes: [],
      };
    }
  }),

  /**
   * Get unique entity types
   */
  getEntityTypes: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) return [];

      const { data: logs } = await supabase
        .from('AuditLog')
        .select('entityType');

      const entityTypes = new Set<string>();
      logs?.forEach((log) => {
        if (log.entityType) {
          entityTypes.add(log.entityType);
        }
      });

      return Array.from(entityTypes).sort();
    } catch (err) {
      console.error('getEntityTypes exception:', err);
      return [];
    }
  }),

  /**
   * Get unique actions
   */
  getActions: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) return [];

      const { data: logs } = await supabase
        .from('AuditLog')
        .select('action');

      const actions = new Set<string>();
      logs?.forEach((log) => {
        if (log.action) {
          actions.add(log.action);
        }
      });

      return Array.from(actions).sort();
    } catch (err) {
      console.error('getActions exception:', err);
      return [];
    }
  }),

  /**
   * Get audit logs for a specific user
   */
  getUserAuditLogs: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const supabase = ctx.adminSupabase;
        if (!supabase) return [];

        const { data: logs, error } = await supabase
          .from('AuditLog')
          .select('*')
          .eq('userId', input.userId)
          .order('createdAt', { ascending: false })
          .limit(input.limit);

        if (error) {
          console.error('getUserAuditLogs error:', error);
          return [];
        }

        return logs || [];
      } catch (err) {
        console.error('getUserAuditLogs exception:', err);
        return [];
      }
    }),

  /**
   * Get audit logs for a specific entity
   */
  getEntityAuditLogs: adminProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const supabase = ctx.adminSupabase;
        if (!supabase) return [];

        let { data: logs, error } = await supabase
          .from('AuditLog')
          .select(`
            *,
            user:User!AuditLog_userId_fkey(
              id,
              email,
              Profile(firstName, lastName)
            )
          `)
          .eq('entityType', input.entityType)
          .eq('entityId', input.entityId)
          .order('createdAt', { ascending: false })
          .limit(input.limit);

        if (error) {
          console.error('getEntityAuditLogs join error, trying plain select:', error);
          const fallbackRes = await supabase
            .from('AuditLog')
            .select('*')
            .eq('entityType', input.entityType)
            .eq('entityId', input.entityId)
            .order('createdAt', { ascending: false })
            .limit(input.limit);
          logs = fallbackRes.data as any;
        }

        return logs || [];
      } catch (err) {
        console.error('getEntityAuditLogs exception:', err);
        return [];
      }
    }),
});
