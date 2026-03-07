/**
 * Admin Settings Router
 * Handles platform settings storage and retrieval
 */

import crypto from 'crypto';
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

// Settings schema
const settingsSchema = z.object({
  general: z.object({
    platformName: z.string(),
    supportEmail: z.string().email(),
    maintenanceMode: z.boolean(),
    userRegistration: z.boolean(),
  }),
  email: z.object({
    smtpHost: z.string(),
    smtpPort: z.string(),
  }),
  security: z.object({
    require2FA: z.boolean(),
    autoBanSuspicious: z.boolean(),
  }),
  features: z.object({
    aiRecommendations: z.boolean(),
    videoInterviews: z.boolean(),
    teamCollaboration: z.boolean(),
  }),
});

type Settings = z.infer<typeof settingsSchema>;

// Default settings
const defaultSettings: Settings = {
  general: {
    platformName: 'JobHorizons',
    supportEmail: process.env.ADMIN_EMAIL || 'support@example.com',
    maintenanceMode: false,
    userRegistration: true,
  },
  email: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
  },
  security: {
    require2FA: false,
    autoBanSuspicious: true,
  },
  features: {
    aiRecommendations: true,
    videoInterviews: false,
    teamCollaboration: true,
  },
};

export const adminSettingsRouter = router({
  /**
   * Get admin settings
   * Uses AuditLog table to store settings as a workaround
   */
  getSettings: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    // Try to get settings from database (stored in AuditLog metadata as a workaround)
    const { data: settingsLog } = await supabase
      .from('AuditLog')
      .select('metadata')
      .eq('action', 'ADMIN_SETTINGS')
      .eq('entityType', 'SETTINGS')
      .order('createdAt', { ascending: false })
      .limit(1)
      .single();

    if (settingsLog && settingsLog.metadata) {
      return settingsLog.metadata as Settings;
    }

    return defaultSettings;
  }),

  /**
   * Update admin settings
   */
  updateSettings: adminProcedure
    .input(settingsSchema)
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // Store settings in AuditLog table as a workaround
      const { error } = await supabase.from('AuditLog').insert({
        id: crypto.randomUUID(),
        action: 'ADMIN_SETTINGS',
        entityType: 'SETTINGS',
        entityId: 'admin-settings',
        userId: ctx.session?.user?.id || null,
        metadata: input as any,
        createdAt: new Date().toISOString(),
      });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update settings.',
        });
      }

      return { success: true, settings: input };
    }),
});
