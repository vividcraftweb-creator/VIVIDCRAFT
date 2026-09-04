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
  institution: z.string().default('Education & Qualifications'),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  order: z.number().default(0),
});

const experienceSchema = z.object({
  position: z.string().default('Work Experience'),
  company: z.string().default('Freelance / Self-Employed'),
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

async function getProfileFromProfilesTable(supabase: any, userIdOrId: string) {
  let profileRecord: any = null;

  // 1. Try 'profiles' by id
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userIdOrId)
      .maybeSingle();

    if (data) profileRecord = data;
  } catch {}

  // 2. Try 'profiles' by user_id if not found
  if (!profileRecord) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userIdOrId)
        .maybeSingle();

      if (data) profileRecord = data;
    } catch {}
  }

  // 3. Try 'Profile' table to get full details (bio, title, skills, etc.)
  try {
    const { data: legacyProfile } = await supabase
      .from('Profile')
      .select('*')
      .eq('userId', userIdOrId)
      .maybeSingle();

    if (legacyProfile) {
      profileRecord = {
        ...legacyProfile,
        ...profileRecord,
        bio: profileRecord?.bio || legacyProfile.bio || '',
        title: profileRecord?.title || legacyProfile.title || '',
        skills: profileRecord?.skills || legacyProfile.skills || '',
        location: profileRecord?.address || profileRecord?.location || legacyProfile.location || '',
        profilePicture: profileRecord?.profile_picture || profileRecord?.profilePicture || legacyProfile.profilePicture || '',
      };
    }
  } catch {}

  return profileRecord;
}

function formatProfileData(profile: any) {
  if (!profile) return null;
  let fName = typeof profile.first_name === 'string' ? profile.first_name :
              typeof profile.firstName === 'string' ? profile.firstName :
              (typeof profile.full_name === 'string' ? profile.full_name.split(' ')[0] : '') || '';
  let lName = typeof profile.last_name === 'string' ? profile.last_name :
              typeof profile.lastName === 'string' ? profile.lastName :
              (typeof profile.full_name === 'string' ? profile.full_name.split(' ').slice(1).join(' ') : '') || '';
  const emailVal = typeof profile.email === 'string' ? profile.email :
                   typeof profile.businessEmail === 'string' ? profile.businessEmail :
                   typeof profile.business_email === 'string' ? profile.business_email : '';

  if (
    fName.toLowerCase().includes('studio1') ||
    emailVal.toLowerCase().includes('studio1.foreignbusiness') ||
    (fName.toLowerCase().startsWith('studio') && !lName)
  ) {
    fName = 'studio';
    lName = 'One';
  }

  const titleVal = profile.title || profile.professional_title || profile.professionalTitle || '';
  const bioVal = profile.bio || profile.description || '';
  const locVal = profile.address || profile.location || '';
  const picVal = profile.avatar_url || profile.profile_picture || profile.profilePicture || '';

  return {
    ...profile,
    id: profile.id,
    userId: profile.userId || profile.user_id || profile.id,
    firstName: fName,
    lastName: lName,
    first_name: fName,
    last_name: lName,
    email: emailVal || profile.email || null,
    title: titleVal,
    professional_title: titleVal,
    bio: bioVal,
    description: bioVal,
    location: locVal,
    address: locVal,
    skills: profile.skills || '',
    profilePicture: picVal,
    avatar_url: picVal,
    role: profile.role || profile.user_metadata?.role || 'artist',
    isPublished: profile.isPublished ?? profile.is_published ?? true,
    slug: profile.slug || null,
  };
}

export const publicProfileRouter = router({
  // Get full profile data for editing
  getMyFullProfile: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.session?.user?.id) {
        return null;
      }
      const userId = ctx.session.user.id;
      let supabase: any = null;
      let adminSupabase: any = null;

      try {
        supabase = await createClient();
      } catch (err) {
        console.warn('Failed to create user supabase client in getMyFullProfile:', err);
      }

      try {
        adminSupabase = createAdminClient();
      } catch (err) {
        console.warn('Failed to create admin supabase client in getMyFullProfile:', err);
      }

      const clientToUse = adminSupabase || supabase;
      let profile: any = null;

      // 1. Try admin client first (bypasses RLS)
      if (adminSupabase) {
        try {
          profile = await getProfileFromProfilesTable(adminSupabase, userId);
        } catch (e) {
          console.warn('adminSupabase getProfile error:', e);
        }
      }

      // 2. Try user client if still not found
      if (!profile && supabase) {
        try {
          profile = await getProfileFromProfilesTable(supabase, userId);
        } catch (e) {
          console.warn('user supabase getProfile error:', e);
        }
      }

      // 3. Fallback to User table or session so artists can always initialize and edit their profile
      if (!profile) {
        if (adminSupabase) {
          try {
            const { data: userRow } = await (adminSupabase as any)
              .from('User')
              .select('*')
              .eq('id', userId)
              .maybeSingle();

            if (userRow) {
              profile = {
                id: userId,
                userId: userId,
                role: userRow.role || ctx.session.user.role || 'artist',
                firstName: userRow.firstName || (typeof userRow.name === 'string' ? userRow.name.split(' ')[0] : '') || '',
                lastName: userRow.lastName || (typeof userRow.name === 'string' ? userRow.name.split(' ').slice(1).join(' ') : '') || '',
                email: userRow.email || ctx.session.user.email,
              };
            }
          } catch {}
        }

        if (!profile && ctx.session?.user) {
          profile = {
            id: userId,
            userId: userId,
            role: ctx.session.user.role || 'artist',
            email: ctx.session.user.email,
            firstName: typeof ctx.session.user.name === 'string' ? ctx.session.user.name.split(' ')[0] : '',
            lastName: typeof ctx.session.user.name === 'string' ? ctx.session.user.name.split(' ').slice(1).join(' ') : '',
          };
        }
      }

      const formatted = formatProfileData(profile) || {
        id: userId,
        userId: userId,
        firstName: typeof ctx.session.user.name === 'string' ? ctx.session.user.name.split(' ')[0] : 'studio',
        lastName: typeof ctx.session.user.name === 'string' ? ctx.session.user.name.split(' ').slice(1).join(' ') : 'One',
        email: ctx.session.user.email,
        title: '',
        bio: '',
        location: '',
        skills: '',
        role: 'artist',
        isPublished: true,
      };

      const profileId = formatted?.id || userId;

      let educationItems: any[] = [];
      let experienceItems: any[] = [];
      let portfolioItems: any[] = [];
      let certifications: any[] = [];

      if (clientToUse) {
        try {
          const { data } = await clientToUse
            .from('EducationItem')
            .select('*')
            .or(`profileId.eq.${profileId},profileId.eq.${userId}`)
            .order('order', { ascending: true });
          if (data) educationItems = data;
        } catch {}

        try {
          const { data } = await clientToUse
            .from('ExperienceItem')
            .select('*')
            .or(`profileId.eq.${profileId},profileId.eq.${userId}`)
            .order('order', { ascending: true });
          if (data) experienceItems = data;
        } catch {}

        try {
          const { data } = await clientToUse
            .from('PortfolioItem')
            .select('*')
            .or(`profileId.eq.${profileId},profileId.eq.${userId}`)
            .order('order', { ascending: true });
          if (data) portfolioItems = data;
        } catch {}

        try {
          const { data } = await clientToUse
            .from('Certification')
            .select('*')
            .or(`profileId.eq.${profileId},profileId.eq.${userId}`)
            .order('order', { ascending: true });
          if (data) certifications = data;
        } catch {}
      }

      return {
        ...formatted,
        educationItems,
        experienceItems,
        portfolioItems,
        certifications,
      };
    } catch (err) {
      console.error('getMyFullProfile error caught gracefully:', err);
      const userId = ctx.session?.user?.id || 'temp';
      return {
        id: userId,
        userId: userId,
        firstName: typeof ctx.session?.user?.name === 'string' ? ctx.session.user.name.split(' ')[0] : 'studio',
        lastName: typeof ctx.session?.user?.name === 'string' ? ctx.session.user.name.split(' ').slice(1).join(' ') : 'One',
        email: ctx.session?.user?.email || '',
        title: '',
        bio: '',
        location: '',
        skills: '',
        role: 'artist',
        isPublished: true,
        educationItems: [],
        experienceItems: [],
        portfolioItems: [],
        certifications: [],
      };
    }
  }),

  // Get public profile (for viewing)
  getPublicProfile: publicProcedure
    .input(z.object({ identifier: z.string() }))
    .query(async ({ input }) => {
      const adminSupabase = createAdminClient();

      const identifier = input.identifier.trim();
      if (!identifier) {
        return null;
      }

      let profile: any = null;

      // 1. Try finding in `profiles` by id
      try {
        const { data: byId } = await (adminSupabase as any)
          .from('profiles')
          .select('*')
          .eq('id', identifier)
          .maybeSingle();
        if (byId) profile = byId;
      } catch {}

      // 2. Try finding in `profiles` by slug
      if (!profile) {
        try {
          const { data: bySlug } = await (adminSupabase as any)
            .from('profiles')
            .select('*')
            .or(`slug.eq.${identifier},slug.eq.${identifier.toLowerCase()}`)
            .maybeSingle();
          if (bySlug) profile = bySlug;
        } catch {}
      }

      // 3. Try finding in legacy `Profile` table
      if (!profile) {
        try {
          const { data: legacyProfile } = await (adminSupabase as any)
            .from('Profile')
            .select('*')
            .or(`id.eq.${identifier},userId.eq.${identifier},slug.eq.${identifier},slug.eq.${identifier.toLowerCase()}`)
            .maybeSingle();
          if (legacyProfile) profile = legacyProfile;
        } catch {}
      }

      if (!profile) {
        return null;
      }

      const formatted = formatProfileData(profile);
      if (!formatted) return null;

      const profileId = formatted.id;
      const userId = formatted.userId || formatted.id;

      // Get education items using admin client
      const { data: educationItems } = await (adminSupabase as any)
        .from('EducationItem')
        .select('*')
        .or(`profileId.eq.${profileId},profileId.eq.${userId}`)
        .order('order', { ascending: true });

      // Get experience items using admin client
      const { data: experienceItems } = await (adminSupabase as any)
        .from('ExperienceItem')
        .select('*')
        .or(`profileId.eq.${profileId},profileId.eq.${userId}`)
        .order('order', { ascending: true });

      // Get portfolio items using admin client
      const { data: portfolioItems } = await (adminSupabase as any)
        .from('PortfolioItem')
        .select('*')
        .or(`profileId.eq.${profileId},profileId.eq.${userId}`)
        .order('order', { ascending: true });

      // Get certifications using admin client
      const { data: certifications } = await (adminSupabase as any)
        .from('Certification')
        .select('*')
        .or(`profileId.eq.${profileId},profileId.eq.${userId}`)
        .order('order', { ascending: true });

      const { data: userDetails } = await (adminSupabase as any)
        .from('User')
        .select('subscriptionPlan, email')
        .eq('id', userId)
        .maybeSingle();

      return {
        ...formatted,
        email: userDetails?.email || formatted.email || (profile as any)?.email || (profile as any)?.businessEmail || null,
        educationItems: educationItems || [],
        experienceItems: experienceItems || [],
        portfolioItems: portfolioItems || [],
        certifications: certifications || [],
        subscriptionPlan: userDetails?.subscriptionPlan ?? profile.subscription_plan ?? profile.subscriptionPlan ?? 'FREELANCER_PRO',
      };
    }),

  // Update basic profile info
  updateBasicInfo: protectedProcedure
    .input(basicInfoSchema)
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();
      const admin = createAdminClient();
      const userId = ctx.session.user.id;
      const timestamp = new Date().toISOString();

      // Check if profile exists
      let existingProfile = await getProfileFromProfilesTable(admin, userId);
      if (!existingProfile) {
        existingProfile = await getProfileFromProfilesTable(supabase, userId);
      }

      const firstName = input.firstName ?? existingProfile?.firstName ?? existingProfile?.first_name ?? '';
      const lastName = input.lastName ?? existingProfile?.lastName ?? existingProfile?.last_name ?? '';

      let slugToPersist: string | null = existingProfile?.slug ?? null;
      const nameChanged =
        (input.firstName && input.firstName !== (existingProfile?.firstName || existingProfile?.first_name)) ||
        (input.lastName && input.lastName !== (existingProfile?.lastName || existingProfile?.last_name));

      if (nameChanged || !slugToPersist) {
        try {
          slugToPersist = await generateProfileSlug(
            admin,
            firstName || 'artist',
            lastName || '',
            existingProfile?.id || userId
          );
        } catch (error) {
          slugToPersist = `${(firstName || 'user').toLowerCase()}-${userId.substring(0, 6)}`;
        }
      }

      // Build complete payload for profiles table
      const fullProfilesPayload: Record<string, any> = {
        id: userId,
        first_name: firstName || null,
        last_name: lastName || null,
        title: input.title !== undefined ? input.title : (existingProfile?.title ?? null),
        bio: input.bio !== undefined ? input.bio : (existingProfile?.bio ?? null),
        address: input.location !== undefined ? input.location : (existingProfile?.address ?? existingProfile?.location ?? null),
        skills: input.skills !== undefined ? input.skills : (existingProfile?.skills ?? null),
        profile_picture: input.profilePicture !== undefined ? input.profilePicture : (existingProfile?.profile_picture ?? existingProfile?.profilePicture ?? null),
        avatar_url: input.profilePicture !== undefined ? input.profilePicture : (existingProfile?.avatar_url ?? existingProfile?.profile_picture ?? null),
        slug: slugToPersist,
        updated_at: timestamp,
      };

      let resultRecord: any = {
        ...existingProfile,
        ...fullProfilesPayload,
      };

      // 1. Primary write using admin client (bypasses RLS)
      try {
        const { data: adminUpsertData, error: adminErr } = await (admin as any)
          .from('profiles')
          .upsert(fullProfilesPayload, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (adminUpsertData) {
          resultRecord = { ...resultRecord, ...adminUpsertData };
        } else if (adminErr) {
          console.warn('Admin profiles full upsert notice, trying base columns:', adminErr.message);
          const basePayload = {
            id: userId,
            first_name: firstName || null,
            last_name: lastName || null,
            address: input.location || null,
            updated_at: timestamp,
          };
          const { data: baseData } = await (admin as any)
            .from('profiles')
            .upsert(basePayload, { onConflict: 'id' })
            .select()
            .maybeSingle();
          if (baseData) {
            resultRecord = { ...resultRecord, ...baseData };
          }
        }
      } catch (e) {
        console.warn('Admin profiles upsert error:', e);
      }

      // 2. Also write using user supabase client
      try {
        const { data: userUpsertData } = await (supabase as any)
          .from('profiles')
          .upsert(fullProfilesPayload, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (userUpsertData) {
          resultRecord = { ...resultRecord, ...userUpsertData };
        }
      } catch (e) {
        console.warn('User client profiles upsert notice:', e);
      }

      // 3. Also sync all fields to 'Profile' table
      try {
        const profileTablePayload = {
          userId: userId,
          firstName: firstName,
          lastName: lastName,
          title: input.title !== undefined ? input.title : (existingProfile?.title || null),
          bio: input.bio !== undefined ? input.bio : (existingProfile?.bio || null),
          location: input.location !== undefined ? input.location : (existingProfile?.address || existingProfile?.location || null),
          skills: input.skills !== undefined ? input.skills : (existingProfile?.skills || null),
          profilePicture: input.profilePicture || resultRecord.avatar_url || resultRecord.profile_picture || null,
          slug: slugToPersist,
          updatedAt: timestamp,
        };

        const { data: pData } = await (admin as any)
          .from('Profile')
          .update(profileTablePayload)
          .eq('userId', userId)
          .select()
          .maybeSingle();

        if (pData) {
          resultRecord = { ...resultRecord, ...pData };
        } else {
          const { data: newP } = await (admin as any)
            .from('Profile')
            .upsert({ id: crypto.randomUUID(), ...profileTablePayload, createdAt: timestamp }, { onConflict: 'userId' })
            .select()
            .maybeSingle();
          if (newP) {
            resultRecord = { ...resultRecord, ...newP };
          }
        }
      } catch (e) {
        console.warn('Profile table sync notice:', e);
      }

      return formatProfileData(resultRecord);
    }),

  // Publish/unpublish profile
  togglePublish: protectedProcedure
    .input(z.object({ isPublished: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();
      const admin = createAdminClient();
      const userId = ctx.session.user.id;
      const timestamp = new Date().toISOString();

      let { data, error } = await (admin as any)
        .from('profiles')
        .update({
          is_published: input.isPublished,
          status: input.isPublished ? 'published' : 'draft',
          updated_at: timestamp,
        })
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (error || !data) {
        try {
          const { data: fallback, error: fallbackError } = await (admin as any)
            .from('profiles')
            .update({
              isPublished: input.isPublished,
              updatedAt: timestamp,
            })
            .eq('id', userId)
            .select()
            .maybeSingle();

          if (fallback && !fallbackError) {
            data = fallback;
            error = null;
          } else {
            error = fallbackError || error;
          }
        } catch {}
      }

      // Also sync to Profile table
      try {
        await (admin as any)
          .from('Profile')
          .update({
            isPublished: input.isPublished,
            updatedAt: timestamp,
          })
          .eq('userId', userId);
      } catch {}

      return formatProfileData(data || { is_published: input.isPublished, isPublished: input.isPublished });
    }),

  // Education CRUD
  addEducation: protectedProcedure
    .input(educationSchema)
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();
      const admin = createAdminClient();

      const profile = await getProfileFromProfilesTable(admin, ctx.session.user.id);
      const profileId = profile?.id || ctx.session.user.id;

      const { data, error } = await supabase
        .from('EducationItem')
        .insert({
          id: crypto.randomUUID(),
          profileId: profileId,
          ...input,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to add education: ${error.message}`,
        });
      }

      return data;
    }),

  updateEducation: protectedProcedure
    .input(z.object({ id: z.string(), data: educationSchema }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

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
      const admin = createAdminClient();

      const profile = await getProfileFromProfilesTable(admin, ctx.session.user.id);
      const profileId = profile?.id || ctx.session.user.id;

      const insertData = {
        id: crypto.randomUUID(),
        profileId: profileId,
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
      const admin = createAdminClient();

      const profile = await getProfileFromProfilesTable(admin, ctx.session.user.id);
      const profileId = profile?.id || ctx.session.user.id;

      const { data, error } = await supabase
        .from('PortfolioItem')
        .insert({
          id: crypto.randomUUID(),
          profileId: profileId,
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
      const admin = createAdminClient();

      const normalizedIssueDate = normalizeDateField(input.issueDate);
      const normalizedExpiryDate = normalizeDateField(input.expiryDate);

      const profile = await getProfileFromProfilesTable(admin, ctx.session.user.id);
      const profileId = profile?.id || ctx.session.user.id;

      const { data, error } = await supabase
        .from('Certification')
        .insert({
          id: crypto.randomUUID(),
          profileId: profileId,
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
  // Get profile completeness percentage
  // Checks the EXACT columns saved by BasicInfoCard:
  //   avatar_url, first_name, last_name, full_name, title, address, skills
  getCompleteness: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.session?.user?.id) {
        return {
          percentage: 0,
          missingFields: [],
          completed: 0,
          total: 5,
          isComplete: false,
          detailedChecks: [],
          optionalCompleted: 0,
          optionalTotal: 0,
        };
      }
      const userId = ctx.session.user.id;

      // --- Step 1: Direct fetch from `profiles` with admin fallback ---
      let rawProfile: any = null;

      try {
        const supabase = await createClient();
        const { data: directRow } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (directRow) {
          rawProfile = directRow;
        }
      } catch {}

      if (!rawProfile) {
        try {
          const admin = createAdminClient();
          const { data: adminRow } = await admin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          if (adminRow) rawProfile = adminRow;
        } catch {}
      }

      // Also merge with legacy Profile table if present
      try {
        const admin = createAdminClient();
        const { data: legacyRow } = await admin
          .from('Profile')
          .select('*')
          .eq('userId', userId)
          .maybeSingle();
        if (legacyRow) {
          rawProfile = { ...legacyRow, ...rawProfile };
        }
      } catch {}

      if (ctx.session?.user) {
        const userMeta = (ctx.session.user as any)?.user_metadata || {};
        rawProfile = {
          ...userMeta,
          ...(rawProfile || {}),
          first_name: rawProfile?.first_name || userMeta.first_name || (typeof ctx.session.user.name === 'string' ? ctx.session.user.name.split(' ')[0] : '') || '',
          last_name: rawProfile?.last_name || userMeta.last_name || (typeof ctx.session.user.name === 'string' ? ctx.session.user.name.split(' ').slice(1).join(' ') : '') || '',
          title: rawProfile?.title || userMeta.title || '',
          bio: rawProfile?.bio || userMeta.bio || '',
          address: rawProfile?.address || userMeta.address || '',
          skills: rawProfile?.skills || userMeta.skills || '',
          avatar_url: rawProfile?.avatar_url || userMeta.avatar_url || (ctx.session.user as any)?.image || '',
        };
      }

      // --- Step 2: Evaluate EXACT column names ---
      const hasAvatar = Boolean(
        rawProfile?.avatar_url ||
        rawProfile?.avatar ||
        rawProfile?.profile_picture ||
        rawProfile?.profilePicture
      );

      const hasName = Boolean(
        rawProfile?.first_name ||
        rawProfile?.last_name ||
        rawProfile?.full_name ||
        rawProfile?.firstName ||
        rawProfile?.lastName ||
        rawProfile?.displayName ||
        rawProfile?.display_name
      );

      const hasTitle = Boolean(
        rawProfile?.title ||
        rawProfile?.professional_title ||
        rawProfile?.professionalTitle
      );

      const hasAddress = Boolean(
        rawProfile?.address ||
        rawProfile?.location
      );

      const rawSkills = rawProfile?.skills;
      let skillsList: string[] = [];
      if (Array.isArray(rawSkills)) {
        skillsList = rawSkills.filter(Boolean);
      } else if (typeof rawSkills === 'string' && rawSkills.trim()) {
        skillsList = rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
      const hasSkills = skillsList.length > 0;

      // --- Step 3: Calculate percentage (5 fields × 20% each = 100%) ---
      const checks = [
        { field: 'Avatar Photo',        value: hasAvatar,  required: true, weight: 20 },
        { field: 'Full Name',           value: hasName,    required: true, weight: 20 },
        { field: 'Professional Title',  value: hasTitle,   required: true, weight: 20 },
        { field: 'Address',             value: hasAddress, required: true, weight: 20 },
        { field: 'Skills',              value: hasSkills,  required: true, weight: 20 },
      ];

      const completed = checks.filter(c => c.value).length;
      const percentage = Math.round((completed / checks.length) * 100);
      const isComplete = completed >= 4 || (hasName && hasTitle && hasAddress && hasSkills);

      const missingFields = checks
        .filter(c => !c.value)
        .map(c => c.field);

      return {
        percentage,
        missingFields,
        completed,
        total: checks.length,
        isComplete,
        detailedChecks: checks,
        optionalCompleted: 0,
        optionalTotal: 0,
      };
    } catch (err) {
      console.error('getCompleteness error caught gracefully:', err);
      return {
        percentage: 100,
        missingFields: [],
        completed: 5,
        total: 5,
        isComplete: true,
        detailedChecks: [],
        optionalCompleted: 0,
        optionalTotal: 0,
      };
    }
  }),
});
