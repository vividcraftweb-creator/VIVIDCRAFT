import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { getUserFeaturePermissions } from '@/lib/feature-enforcement';
import { emailTemplates } from '@/lib/email-edge';

// Helper to check if user has team collaboration access (Business or Enterprise)
async function requireTeamAccess(userId: string) {
  const permissions = await getUserFeaturePermissions(userId);
  if (!permissions.hasTeamCollaboration) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Team collaboration requires Business or Enterprise plan',
    });
  }
}

export const teamRouter = router({
  // List all team members
  list: protectedProcedure.query(async ({ ctx }) => {
    await requireTeamAccess(ctx.session.user.id);
    const supabase = await createClient();

    const { data: members, error } = await supabase
      .from('TeamMember')
      .select('*')
      .eq('organizationId', ctx.session.user.id)
      // Don't filter by isActive - we want both active and pending members
      .order('createdAt', { ascending: false });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch team members',
      });
    }

    return members || [];
  }),

  // Invite a team member
  invite: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'VIEWER']),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireTeamAccess(ctx.session.user.id);

      const supabase = await createClient();
      // Use admin client for User table queries
      const adminSupabase = createAdminClient();

      // Check team member limit for Business plan (2 members max)
      const { data: inviter } = await adminSupabase
        .from('User')
        .select('subscriptionPlan')
        .eq('id', ctx.session.user.id)
        .single();

      if (inviter && inviter.subscriptionPlan === 'CLIENT_BUSINESS') {
        const { data: existingMembers, error: countError } = await supabase
          .from('TeamMember')
          .select('id', { count: 'exact' })
          .eq('organizationId', ctx.session.user.id)
          .eq('isActive', true);

        if (countError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to check team size',
          });
        }

        // Business plan allows up to 2 team members
        if (existingMembers && existingMembers.length >= 2) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Business plan allows up to 2 team members. Upgrade to Enterprise for unlimited team members.',
          });
        }
      }

      // Check if user already exists
      const { data: existingUser } = await adminSupabase
        .from('User')
        .select('id')
        .eq('email', input.email)
        .single();

      // Check if already a team member
      if (existingUser) {
        const { data: existingMember } = await supabase
          .from('TeamMember')
          .select('id')
          .eq('organizationId', ctx.session.user.id)
          .eq('userId', existingUser.id)
          .eq('isActive', true)
          .single();

        if (existingMember) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User is already a team member',
          });
        }
      }

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create team member record
      const { data: member, error: createError } = await supabase
        .from('TeamMember')
        .insert({
          id: crypto.randomUUID(),
          organizationId: ctx.session.user.id,
          userId: existingUser?.id || null,
          email: input.email,
          name: input.name,
          role: input.role,
          invitedBy: ctx.session.user.id,
          invitationToken,
          invitationExpiresAt: expiresAt.toISOString(),
          isActive: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !member) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create team member invitation',
        });
      }

      // Send invitation email
      try {
        // Get inviter's profile information
        const { data: inviterProfile } = await (supabase as any)
          .from('profiles')
          .select('first_name, last_name, company_name')
          .eq('id', ctx.session.user.id)
          .maybeSingle();

        const inviterName = inviterProfile?.first_name && inviterProfile?.last_name
          ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
          : ctx.session.user.name || ctx.session.user.email || 'A team member';

        const organizationName = inviterProfile?.company_name;

        const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/team/join/${invitationToken}`;

        await emailTemplates.sendTeamInvitationEmail(
          input.email,
          inviterName || 'Team member',
          organizationName || 'Organization',
          input.role,
          invitationLink
        );
      } catch (emailError) {
        // Email sending failed silently
      }

      return member;
    }),

  acceptInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Find invitation
      const { data: member, error: fetchError } = await supabase
        .from('TeamMember')
        .select('*')
        .eq('invitationToken', input.token)
        .single();

      if (fetchError || !member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid or expired invitation',
        });
      }

      // Check expiration
      if (new Date(member.invitationExpiresAt!) < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invitation has expired',
        });
      }

      // Check email matches
      if (member.email !== ctx.session.user.email) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Invitation is for a different email address',
        });
      }

      // Activate membership
      const { error: updateError } = await supabase
        .from('TeamMember')
        .update({
          userId: ctx.session.user.id,
          isActive: true,
          acceptedAt: new Date().toISOString(),
          invitationToken: null,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', member.id);

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to accept invitation',
        });
      }

      return { success: true };
    }),

  // Update team member role
  updateRole: protectedProcedure
    .input(
      z.object({
        memberId: z.string(),
        role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'VIEWER']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireTeamAccess(ctx.session.user.id);

      const supabase = await createClient();

      // Verify member exists and belongs to organization
      const { data: member, error: fetchError } = await supabase
        .from('TeamMember')
        .select('*')
        .eq('id', input.memberId)
        .eq('organizationId', ctx.session.user.id)
        .single();

      if (fetchError || !member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team member not found',
        });
      }

      // Update role
      const { error: updateError } = await supabase
        .from('TeamMember')
        .update({
          role: input.role,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.memberId);

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update team member role',
        });
      }

      return { success: true };
    }),

  // Remove team member
  remove: protectedProcedure
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireTeamAccess(ctx.session.user.id);

      const supabase = await createClient();

      // Verify member exists and belongs to organization
      const { data: member, error: fetchError } = await supabase
        .from('TeamMember')
        .select('*')
        .eq('id', input.memberId)
        .eq('organizationId', ctx.session.user.id)
        .single();

      if (fetchError || !member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team member not found',
        });
      }

      // Soft delete (set isActive to false)
      const { error: updateError } = await supabase
        .from('TeamMember')
        .update({
          isActive: false,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.memberId);

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove team member',
        });
      }

      return { success: true };
    }),

  // Get team activity logs
  getActivityLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireTeamAccess(ctx.session.user.id);

      const supabase = await createClient();

      const { data: logs, error } = await supabase
        .from('AuditLog')
        .select('*')
        .eq('userId', ctx.session.user.id)
        .order('createdAt', { ascending: false })
        .limit(input.limit);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch activity logs',
        });
      }

      return logs || [];
    }),
});
