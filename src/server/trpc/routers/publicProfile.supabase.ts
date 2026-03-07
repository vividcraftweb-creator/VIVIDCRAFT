/**
 * Public Profile Router - Migrated to Supabase
 * Handles full profile editor with education, experience, portfolio, and certifications
 */

import { router, protectedProcedure, publicProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { type Profile } from '@/types/database.types';
import { generateProfileSlug } from '@/server/utils/profileSlug';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// Validation schemas
const basicInfoSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  title: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  skills: z.string().optional(),
  rate: z.number().positive().optional(),
  profilePicture: z.string().optional(),
});

const educationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  order: z.number().default(0),
});

const experienceSchema = z.object({
  position: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  order: z.number().default(0),
});

const portfolioSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  url: z.string().url().optional().or(z.literal('')),
  technologies: z.string().optional(),
  order: z.number().default(0),
});

const credentialUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      if (value.startsWith('/uploads/')) return true;
      try {
        const parsed = new URL(value);
        return Boolean(parsed);
      } catch {
        return false;
      }
    },
    { message: 'Credential must be a valid URL or uploaded file path.' }
  );

const certificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().min(1),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  credentialId: z.string().optional(),
  credentialUrl: credentialUrlSchema.optional(),
  order: z.number().default(0),
});
const certificationUploadSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().min(1).max(10 * 1024 * 1024),
  fileData: z.string().min(1),
});

type ProfileOwnershipRecord = {
  id: string;
  profileId: string;
  Profile: {
    userId: string;
  };
};

type ProfileWithSubscription = {
  id: Profile['id'];
  userId: Profile['userId'];
  User: {
    subscriptionPlan: string | null;
  };
};

const normalizeDateField = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Please provide valid certification dates.',
    });
  }

  return parsed.toISOString().split('T')[0];
};

const ALLOWED_CERT_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

export const publicProfileRouter = router({
  // Get full profile data for editing
  getMyFullProfile: protectedProcedure.query(async ({ ctx }) => {
    const supabase = await createClient();

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('Profile')
      .select('*')
      .eq('userId', ctx.session.user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    // Get education items
    const { data: educationItems } = await supabase
      .from('EducationItem')
      .select('*')
      .eq('profileId', profile.id)
      .order('order', { ascending: true });

    // Get experience items
    const { data: experienceItems } = await supabase
      .from('ExperienceItem')
      .select('*')
      .eq('profileId', profile.id)
      .order('order', { ascending: true });

    // Get portfolio items
    const { data: portfolioItems } = await supabase
      .from('PortfolioItem')
      .select('*')
      .eq('profileId', profile.id)
      .order('order', { ascending: true });

    // Get certifications
    const { data: certifications } = await supabase
      .from('Certification')
      .select('*')
      .eq('profileId', profile.id)
      .order('order', { ascending: true });

    return {
      ...profile,
      educationItems: educationItems || [],
      experienceItems: experienceItems || [],
      portfolioItems: portfolioItems || [],
      certifications: certifications || [],
    };
  }),

  // Get public profile (for viewing)
  getPublicProfile: publicProcedure
    .input(z.object({ identifier: z.string() }))
    .query(async ({ input }) => {
      const supabase = await createClient();
      // Use admin client for User table queries
      const adminSupabase = createAdminClient();

      const identifier = input.identifier.trim();
      if (!identifier) {
        return null;
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      const column = isUuid ? 'userId' : 'slug';
      const value = isUuid ? identifier : identifier.toLowerCase();

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('Profile')
        .select('*')
        .eq(column, value)
        .single();

      if (profileError || !profile || !profile.isPublished) {
        return null;
      }

      // Get education items
      const { data: educationItems } = await supabase
        .from('EducationItem')
        .select('*')
        .eq('profileId', profile.id)
        .order('order', { ascending: true });

      // Get experience items
      const { data: experienceItems } = await supabase
        .from('ExperienceItem')
        .select('*')
        .eq('profileId', profile.id)
        .order('order', { ascending: true });

      // Get portfolio items
      const { data: portfolioItems } = await supabase
        .from('PortfolioItem')
        .select('*')
        .eq('profileId', profile.id)
        .order('order', { ascending: true });

      // Get certifications
      const { data: certifications } = await supabase
        .from('Certification')
        .select('*')
        .eq('profileId', profile.id)
        .order('order', { ascending: true });

      const { data: userDetails } = await adminSupabase
        .from('User')
        .select('subscriptionPlan')
        .eq('id', profile.userId)
        .single();

      return {
        ...profile,
        educationItems: educationItems || [],
        experienceItems: experienceItems || [],
        portfolioItems: portfolioItems || [],
        certifications: certifications || [],
        subscriptionPlan: userDetails?.subscriptionPlan ?? null,
      };
    }),

  // Update basic profile info
  updateBasicInfo: protectedProcedure
    .input(basicInfoSchema)
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('Profile')
        .select('id, firstName, lastName, slug')
        .eq('userId', ctx.session.user.id)
        .single();

      const timestamp = new Date().toISOString();

      if (existingProfile) {
        let slugToPersist: string | null = existingProfile.slug ?? null;

        // Only regenerate slug if name has changed
        const nameChanged =
          (input.firstName && input.firstName !== existingProfile.firstName) ||
          (input.lastName && input.lastName !== existingProfile.lastName);

        if (nameChanged) {
          try {
            slugToPersist = await generateProfileSlug(
              supabase,
              input.firstName ?? existingProfile.firstName,
              input.lastName ?? existingProfile.lastName,
              existingProfile.id
            );
          } catch (error) {
          }
        }

        // Update existing profile
        const { data, error } = await supabase
          .from('Profile')
          .update({
            ...input,
            slug: slugToPersist,
            updatedAt: timestamp,
          })
          .eq('userId', ctx.session.user.id)
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to update profile: ${error.message || 'Unknown error'}`,
          });
        }

        return data;
      } else {
        let slugToPersist: string | null = null;

        try {
          slugToPersist = await generateProfileSlug(
            supabase,
            input.firstName,
            input.lastName
          );
        } catch (error) {
        }

        // Create new profile
        const { data, error } = await supabase
          .from('Profile')
          .insert({
            id: crypto.randomUUID(),
            userId: ctx.session.user.id,
            ...input,
            slug: slugToPersist,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to create profile: ${error.message || 'Unknown error'}`,
          });
        }

        return data;
      }
    }),

  // Publish/unpublish profile
  togglePublish: protectedProcedure
    .input(z.object({ isPublished: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('Profile')
        .update({
          isPublished: input.isPublished,
          updatedAt: new Date().toISOString(),
        })
        .eq('userId', ctx.session.user.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
        });
      }

      return data;
    }),

  // Education CRUD
  addEducation: protectedProcedure
    .input(educationSchema)
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      const { data: profile, error: profileError } = await supabase
        .from('Profile')
        .select('id')
        .eq('userId', ctx.session.user.id)
        .single();

      if (profileError || !profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not found. Please create a profile first.',
        });
      }

      const { data, error } = await supabase
        .from('EducationItem')
        .insert({
          id: crypto.randomUUID(),
          profileId: profile.id,
          ...input,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add education',
        });
      }

      return data;
    }),

  updateEducation: protectedProcedure
    .input(z.object({ id: z.string(), data: educationSchema }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Verify ownership
      const { data: item, error: fetchError } = await supabase
        .from('EducationItem')
        .select('id, profileId, Profile!inner(userId)')
        .eq('id', input.id)
        .single<ProfileOwnershipRecord>();

      if (fetchError || !item || item.Profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to update this item',
        });
      }

      const { data, error } = await supabase
        .from('EducationItem')
        .update({
          ...input.data,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update education',
        });
      }

      return data;
    }),

  deleteEducation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Verify ownership
      const { data: item, error: fetchError } = await supabase
        .from('EducationItem')
        .select('id, profileId, Profile!inner(userId)')
        .eq('id', input.id)
        .single<ProfileOwnershipRecord>();

      if (fetchError || !item || item.Profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to delete this item',
        });
      }

      const { error } = await supabase
        .from('EducationItem')
        .delete()
        .eq('id', input.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete education',
        });
      }

      return { success: true };
    }),

  // Experience CRUD
  addExperience: protectedProcedure
    .input(experienceSchema)
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      const { data: profile, error: profileError } = await supabase
        .from('Profile')
        .select('id')
        .eq('userId', ctx.session.user.id)
        .single();

      if (profileError || !profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not found',
        });
      }

      const insertData = {
        id: crypto.randomUUID(),
        profileId: profile.id,
        ...input,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('ExperienceItem')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to add experience: ${error.message || 'Unknown error'}`,
        });
      }

      return data;
    }),

  updateExperience: protectedProcedure
    .input(z.object({ id: z.string(), data: experienceSchema }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Verify ownership
      const { data: item, error: fetchError } = await supabase
        .from('ExperienceItem')
        .select('id, profileId, Profile!inner(userId)')
        .eq('id', input.id)
        .single<ProfileOwnershipRecord>();

      if (fetchError || !item || item.Profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized',
        });
      }

      const { data, error } = await supabase
        .from('ExperienceItem')
        .update({
          ...input.data,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update experience',
        });
      }

      return data;
    }),

  deleteExperience: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Verify ownership
      const { data: item, error: fetchError } = await supabase
        .from('ExperienceItem')
        .select('id, profileId, Profile!inner(userId)')
        .eq('id', input.id)
        .single<ProfileOwnershipRecord>();

      if (fetchError || !item || item.Profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized',
        });
      }

      const { error } = await supabase
        .from('ExperienceItem')
        .delete()
        .eq('id', input.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete experience',
        });
      }

      return { success: true };
    }),

  // Portfolio CRUD
  addPortfolio: protectedProcedure
    .input(portfolioSchema)
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Get profile with user subscription plan
      const { data: profile, error: profileError } = await supabase
        .from('Profile')
        .select('id, userId, User!inner(subscriptionPlan)')
        .eq('userId', ctx.session.user.id)
        .single<ProfileWithSubscription>();

      if (profileError || !profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not found',
        });
      }

      // Get current portfolio count
      const { count } = await supabase
        .from('PortfolioItem')
        .select('*', { count: 'exact', head: true })
        .eq('profileId', profile.id);

      const currentCount = count || 0;

      // Check portfolio limit based on subscription plan
      const subscriptionPlan = profile.User.subscriptionPlan;
      const maxPortfolioItems = subscriptionPlan === 'FREELANCER_FREE'
        ? 5
        : subscriptionPlan === 'FREELANCER_PRO'
        ? 20
        : Infinity; // FREELANCER_ELITE or other plans

      if (currentCount >= maxPortfolioItems) {
        const upgradeMessage = subscriptionPlan === 'FREELANCER_FREE'
          ? 'Free plan allows maximum 5 portfolio items. Upgrade to Pro (20 items) or Elite (unlimited) to add more.'
          : 'Pro plan allows maximum 20 portfolio items. Upgrade to Elite for unlimited portfolio items.';

        throw new TRPCError({
          code: 'FORBIDDEN',
          message: upgradeMessage,
        });
      }

      const { data, error } = await supabase
        .from('PortfolioItem')
        .insert({
          id: crypto.randomUUID(),
          profileId: profile.id,
          ...input,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to add portfolio item: ${error.message || 'Unknown error'}`,
        });
      }

      return data;
    }),

  updatePortfolio: protectedProcedure
    .input(z.object({ id: z.string(), data: portfolioSchema }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Verify ownership
      const { data: item, error: fetchError } = await supabase
        .from('PortfolioItem')
        .select('id, profileId, Profile!inner(userId)')
        .eq('id', input.id)
        .single<ProfileOwnershipRecord>();

      if (fetchError || !item || item.Profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized',
        });
      }

      const { data, error } = await supabase
        .from('PortfolioItem')
        .update({
          ...input.data,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update portfolio item: ${error.message || 'Unknown error'}`,
        });
      }

      return data;
    }),

  deletePortfolio: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Verify ownership
      const { data: item, error: fetchError } = await supabase
        .from('PortfolioItem')
        .select('id, profileId, Profile!inner(userId)')
        .eq('id', input.id)
        .single<ProfileOwnershipRecord>();

      if (fetchError || !item || item.Profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized',
        });
      }

      const { error } = await supabase
        .from('PortfolioItem')
        .delete()
        .eq('id', input.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete portfolio item',
        });
      }

      return { success: true };
    }),

  // Certification CRUD
  uploadCertificationAsset: protectedProcedure
    .input(certificationUploadSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      if (!ALLOWED_CERT_MIME.has(input.mimeType)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only PDF or image files are allowed for certifications.',
        });
      }

      const base64Data = input.fileData.includes(',')
        ? input.fileData.split(',').pop() ?? ''
        : input.fileData;

      if (!base64Data) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid file data provided.',
        });
      }

      const uploadsDir = join(process.cwd(), 'uploads', 'certifications', userId);
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      const safeFileName = input.fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const uniqueFileName = `${Date.now()}-${safeFileName}`;
      const absolutePath = join(uploadsDir, uniqueFileName);
      await writeFile(absolutePath, Buffer.from(base64Data, 'base64'));

      const relativePath = `/uploads/certifications/${userId}/${uniqueFileName}`.replace(/\\/g, '/');

      return { filePath: relativePath };
    }),

  addCertification: protectedProcedure
    .input(certificationSchema)
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      const normalizedIssueDate = normalizeDateField(input.issueDate);
      const normalizedExpiryDate = normalizeDateField(input.expiryDate);

      const { data: profile, error: profileError } = await supabase
        .from('Profile')
        .select('id')
        .eq('userId', ctx.session.user.id)
        .single();

      if (profileError || !profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not found',
        });
      }

      const { data, error } = await supabase
        .from('Certification')
        .insert({
          id: crypto.randomUUID(),
          profileId: profile.id,
          ...input,
          issueDate: normalizedIssueDate,
          expiryDate: normalizedExpiryDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add certification',
        });
      }

      return data;
    }),

  updateCertification: protectedProcedure
    .input(z.object({ id: z.string(), data: certificationSchema }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      const normalizedIssueDate = normalizeDateField(input.data.issueDate);
      const normalizedExpiryDate = normalizeDateField(input.data.expiryDate);

      // Verify ownership
      const { data: item, error: fetchError } = await supabase
        .from('Certification')
        .select('id, profileId, Profile!inner(userId)')
        .eq('id', input.id)
        .single<ProfileOwnershipRecord>();

      if (fetchError || !item || item.Profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized',
        });
      }

      const { data, error } = await supabase
        .from('Certification')
        .update({
          ...input.data,
          issueDate: normalizedIssueDate,
          expiryDate: normalizedExpiryDate,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update certification',
        });
      }

      return data;
    }),

  deleteCertification: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Verify ownership
      const { data: item, error: fetchError } = await supabase
        .from('Certification')
        .select('id, profileId, Profile!inner(userId)')
        .eq('id', input.id)
        .single<ProfileOwnershipRecord>();

      if (fetchError || !item || item.Profile.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized',
        });
      }

      const { error } = await supabase
        .from('Certification')
        .delete()
        .eq('id', input.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete certification',
        });
      }

      return { success: true };
    }),

  // Get profile completeness percentage
  getCompleteness: protectedProcedure.query(async ({ ctx }) => {
    const supabase = await createClient();

    const { data: profile, error: profileError } = await supabase
      .from('Profile')
      .select('*')
      .eq('userId', ctx.session.user.id)
      .single();

    if (profileError || !profile) {
      return { percentage: 0, missingFields: [], completed: 0, total: 10, isComplete: false, detailedChecks: [] };
    }

    // Get counts for related items across all profile sections
    const [
      { count: educationCount },
      { count: experienceCount },
      { count: portfolioCount },
      { count: certificationCount },
    ] = await Promise.all([
      supabase
        .from('EducationItem')
        .select('*', { count: 'exact', head: true })
        .eq('profileId', profile.id),
      supabase
        .from('ExperienceItem')
        .select('*', { count: 'exact', head: true })
        .eq('profileId', profile.id),
      supabase
        .from('PortfolioItem')
        .select('*', { count: 'exact', head: true })
        .eq('profileId', profile.id),
      supabase
        .from('Certification')
        .select('*', { count: 'exact', head: true })
        .eq('profileId', profile.id),
    ]);

    // Enhanced validation with stricter requirements
    const bioLength = profile.bio?.length || 0;
    const bioValid = bioLength >= 100;

    const skillsList = profile.skills?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];
    const skillsCount = skillsList.length;
    const skillsValid = skillsCount >= 3;

    const portfolioValid = (portfolioCount || 0) >= 1;

    // Check all REQUIRED profile fields (certifications are optional)
    const checks = [
      // Basic Info (Step 1) - 8 required fields with enhanced validation
      { field: 'Profile Picture', value: !!profile.profilePicture, step: 'Basic Info', required: true, detail: profile.profilePicture ? 'Added' : 'Missing' },
      { field: 'First Name', value: !!profile.firstName, step: 'Basic Info', required: true, detail: profile.firstName ? 'Added' : 'Missing' },
      { field: 'Last Name', value: !!profile.lastName, step: 'Basic Info', required: true, detail: profile.lastName ? 'Added' : 'Missing' },
      { field: 'Professional Title', value: !!profile.title, step: 'Basic Info', required: true, detail: profile.title ? 'Added' : 'Missing' },
      { field: 'Bio (100+ characters)', value: bioValid, step: 'Basic Info', required: true, detail: `${bioLength}/100 characters` },
      { field: 'Skills (3+ required)', value: skillsValid, step: 'Basic Info', required: true, detail: `${skillsCount}/3 skills` },
      { field: 'Hourly Rate', value: !!profile.rate, step: 'Basic Info', required: true, detail: profile.rate ? `$${profile.rate}/hr` : 'Missing' },
      { field: 'Location', value: !!profile.location, step: 'Basic Info', required: true, detail: profile.location || 'Missing' },

      // Experience (Step 2) - required
      { field: 'Work Experience', value: (experienceCount || 0) > 0, step: 'Experience', required: true, detail: `${experienceCount || 0} ${(experienceCount || 0) === 1 ? 'entry' : 'entries'}` },

      // Education (Step 3) - required
      { field: 'Education', value: (educationCount || 0) > 0, step: 'Education', required: true, detail: `${educationCount || 0} ${(educationCount || 0) === 1 ? 'entry' : 'entries'}` },

      // Portfolio (Step 4) - required with minimum 1 item
      { field: 'Portfolio Projects', value: portfolioValid, step: 'Portfolio', required: true, detail: `${portfolioCount || 0} ${(portfolioCount || 0) === 1 ? 'project' : 'projects'}` },

      // Certifications (Step 5) - OPTIONAL (not counted in percentage)
      { field: 'Certifications', value: (certificationCount || 0) > 0, step: 'Certifications', required: false, detail: `${certificationCount || 0} ${(certificationCount || 0) === 1 ? 'certificate' : 'certificates'}` },
    ];

    // Only count required fields for percentage calculation
    const requiredChecks = checks.filter(c => c.required);
    const completed = requiredChecks.filter(c => c.value).length;
    const percentage = Math.round((completed / requiredChecks.length) * 100);
    const isComplete = percentage === 100;

    // Show only required missing fields (exclude optional ones like certifications)
    const missingFields = checks
      .filter(c => !c.value && c.required)
      .map(c => `${c.step}: ${c.field}`);

    return {
      percentage,
      missingFields,
      completed,
      total: requiredChecks.length,
      isComplete,
      detailedChecks: checks,
      optionalCompleted: (certificationCount || 0) > 0 ? 1 : 0,
      optionalTotal: 1
    };
  }),
});
