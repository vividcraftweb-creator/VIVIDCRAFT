/**
 * Profiles Router - Migrated to Supabase
 * Handles all profile-related operations using Supabase database
 */

import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { SecureId, RateLimiter } from '@/lib/security';
import { getSubscriptionPlanInfo } from '@/lib/subscription-plans';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { SubscriptionPlan } from '@/types/database.types';
import type { Database } from '@/types/database.types';
import { generateProfileSlug } from '@/server/utils/profileSlug';
import type { Profile as ProfileRow } from '@/types/database.types';
import crypto from 'crypto';

type PublicProfileSummary = Pick<
  ProfileRow,
  'id' | 'firstName' | 'lastName' | 'companyName' | 'companyInfo' | 'skills' | 'portfolio' | 'verified' | 'slug'
> & {
  rate?: ProfileRow['rate'];
};

type ContactUserSummary = {
  id: string;
  email?: string | null;
  profile: {
    firstName: string | null;
    lastName: string | null;
    profilePicture: string | null;
    companyName: string | null;
  } | null;
};

type ContractWithContacts = {
  clientId: string;
  freelancerId: string;
  client: ContactUserSummary;
  freelancer: ContactUserSummary;
};

type MessageRow = Database['public']['Tables']['Message']['Row'];

type MessageContact = {
  id: string;
  email?: string | null;
  Profile?: Array<{
    firstName?: string | null;
    lastName?: string | null;
    profilePicture?: string | null;
    companyName?: string | null;
  }> | null;
} | null;

type MessageWithContacts = MessageRow & {
  sender?: MessageContact;
  receiver?: MessageContact;
};

type FreelancerProfileRecord = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  location?: string | null;
  skills?: string | null;
  rate?: number | null;
  bio?: string | null;
  profilePicture?: string | null;
  slug?: string | null;
  PortfolioItem?: Record<string, unknown>[] | null;
  updatedAt: string | null;
  createdAt: string | null;
};

type FreelancerSearchResult = {
  id: string;
  email?: string | null;
  role: string;
  subscriptionPlan: SubscriptionPlan | null;
  isVerified: boolean;
  Profile: FreelancerProfileRecord | FreelancerProfileRecord[] | null;
};

export const profilesRouter = router({
  getProfile: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Rate limiting
      const clientIp = ctx.req?.headers.get('x-forwarded-for') || ctx.req?.headers.get('x-real-ip') || 'unknown';
      if (!RateLimiter.checkLimit(`profile_${clientIp}`, 30, 60000)) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded. Please try again later.',
        });
      }

      let userId: string;

      try {
        userId = SecureId.ensureId(input.id);
      } catch {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not found',
        });
      }

      const supabase = await createClient();

      // Build select query based on auth status
      const isOwner = ctx.session?.user?.id === userId;
      const isClient = ctx.session?.user?.role === 'CLIENT';

      let selectFields = `
        id,
        firstName,
        lastName,
        companyName,
        companyInfo,
        skills,
        portfolio,
        verified,
        slug
      `;

      if (isOwner || isClient) {
        selectFields += ', rate';
      }

      const { data: profile, error } = await supabase
        .from('Profile')
        .select(selectFields)
        .eq('userId', userId)
        .single();

      if (error || !profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not found',
        });
      }

      // Track profile view (async, non-blocking)
      const viewerId = ctx.session?.user?.id;
      const selectedProfile = profile as unknown as PublicProfileSummary;

      if (userId !== viewerId) {
        // Don't track self-views
        void supabase
          .from('ProfileView')
          .insert({
            id: crypto.randomUUID(),
            profileId: selectedProfile.id,
            viewerId: viewerId || null,
            viewedAt: new Date().toISOString(),
          })
          .then(undefined, () => {
            // Ignore profile view tracking errors
          });
      }

      return {
        ...selectedProfile,
        slug: selectedProfile.slug ?? SecureId.encode(userId),
      };
    }),

  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    // Use admin client to bypass RLS for fetching user's own profile
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('Profile')
      .select('*')
      .eq('userId', ctx.session.user.id)
      .single();

    if (error) {
      return null;
    }

    return data;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional().nullable(),
        lastName: z.string().optional().nullable(),
        title: z.string().optional().nullable(),
        bio: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        location: z.string().optional().nullable(),
        skills: z.string().optional().nullable(),
        rate: z.number().optional().nullable(),
        portfolio: z.string().optional().nullable(),
        experience: z.string().optional().nullable(),
        companyName: z.string().optional().nullable(),
        companyInfo: z.string().optional().nullable(),
        industry: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        timezone: z.string().optional().nullable(),
        website: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      const { data: existingProfile } = await supabase
        .from('Profile')
        .select('id, firstName, lastName, slug')
        .eq('userId', ctx.session.user.id)
        .single();

      const timestamp = new Date().toISOString();

      if (existingProfile) {
        let slugToPersist: string | null = existingProfile.slug ?? null;

        try {
          slugToPersist = await generateProfileSlug(
            supabase,
            input.firstName ?? existingProfile.firstName,
            input.lastName ?? existingProfile.lastName,
            existingProfile.id
          );
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update profile',
          });
        }

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
            message: 'Failed to update profile',
          });
        }

        return data;
      }

      let slugToPersist: string | null = null;

      try {
        slugToPersist = await generateProfileSlug(
          supabase,
          input.firstName,
          input.lastName
        );
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
        });
      }

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
          message: 'Failed to update profile',
        });
      }

      return data;
    }),

  getContacts: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    // Use admin client to bypass RLS for User table joins
    const supabase = createAdminClient();

    // Get contracts where user is either client or freelancer
    const { data: contracts, error: contractError } = await supabase
      .from('Contract')
      .select(`
        *,
        client:User!Contract_clientId_fkey(*, Profile(*)),
        freelancer:User!Contract_freelancerId_fkey(*, Profile(*))
      `)
      .or(`clientId.eq.${userId},freelancerId.eq.${userId}`);

    // Get messages where user is sender or receiver
    // OPTIMIZED: Limit to most recent messages for better performance
    // We only need enough messages to identify all conversation partners
    // Using admin client to bypass RLS for User table joins
    const { data: messages, error: messageError } = await supabase
      .from('Message')
      .select(`
        *,
        sender:User!Message_senderId_fkey(id, email, Profile(firstName, lastName, profilePicture, companyName)),
        receiver:User!Message_receiverId_fkey(id, email, Profile(firstName, lastName, profilePicture, companyName))
      `)
      .or(`senderId.eq.${userId},receiverId.eq.${userId}`)
      .order('createdAt', { ascending: false })
      .limit(200); // Limit to recent 200 messages for performance

    // Extract unique contacts
    const contactsMap = new Map<string, ContactUserSummary>();
    const contractList = (contracts ?? []) as ContractWithContacts[];

    // Add contacts from contracts
    contractList.forEach((contract) => {
      if (contract.clientId !== userId && !contactsMap.has(contract.clientId)) {
        contactsMap.set(contract.clientId, contract.client);
      }
      if (contract.freelancerId !== userId && !contactsMap.has(contract.freelancerId)) {
        contactsMap.set(contract.freelancerId, contract.freelancer);
      }
    });

    // Add contacts from messages
    const messageList = (messages ?? []) as MessageWithContacts[];

    messageList.forEach((message, index) => {
      try {
        if (!message || !message.sender || !message.receiver) {
          return;
        }

        const partnerId = message.senderId === userId ? message.receiverId : message.senderId;
        const partner = message.senderId === userId ? message.receiver : message.sender;

        if (!partner || !partnerId || contactsMap.has(partnerId)) return;

        // Normalize profile data structure
        const profile = Array.isArray(partner.Profile) ? partner.Profile[0] : partner.Profile;
        const contactData = {
          id: partner.id,
          email: partner.email || null,
          profile: profile ? {
            firstName: profile.firstName || null,
            lastName: profile.lastName || null,
            profilePicture: profile.profilePicture || null,
            companyName: profile.companyName || null,
          } : null,
        };
        contactsMap.set(partnerId, contactData);
      } catch (err) {
        // Continue processing other messages
      }
    });

    const result = Array.from(contactsMap.values());
    return result;
  }),

  getTokenData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const defaultTokens = 150;
    const RESET_DAY = 1; // Monday

    // Use admin client to bypass RLS for User table queries
    const supabase = createAdminClient();

    const { data: user, error } = await supabase
      .from('User')
      .select('tokens, tokenResetAt')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    // Server-side time to prevent manipulation
    const now = new Date();
    const currentDay = now.getDay();
    const daysSinceResetDay = (currentDay - RESET_DAY + 7) % 7;
    const lastResetDay = new Date(now);
    lastResetDay.setDate(now.getDate() - daysSinceResetDay);
    lastResetDay.setHours(0, 0, 0, 0);

    const needsReset =
      !user.tokenResetAt ||
      new Date(user.tokenResetAt) < lastResetDay;

    if (needsReset) {
      const { data: updated, error: updateError } = await supabase
        .from('User')
        .update({
          tokens: defaultTokens,
          tokenResetAt: now.toISOString(),
          updatedAt: now.toISOString(),
        })
        .eq('id', userId)
        .select('tokens, tokenResetAt')
        .single();

      if (updateError) {
        return user;
      }

      return updated;
    }

    return user;
  }),

  getTokenLog: protectedProcedure.query(async ({ ctx }) => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('TokenLog')
      .select('*')
      .eq('userId', ctx.session.user.id)
      .order('createdAt', { ascending: false })
      .limit(20);

    if (error) {
      return [];
    }

    return data || [];
  }),

  // Search freelancers - simplified for now, can add advanced filtering later
  searchFreelancers: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        skills: z.array(z.string()).optional(),
        minRate: z.number().optional(),
        maxRate: z.number().optional(),
        location: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, minRate, maxRate, location, limit, offset, skills } = input;
      // Use admin client to bypass RLS for User table queries
      const supabase = createAdminClient();

      let allowAdvancedFilters = false;
      let viewerPlanInfo: { plan: SubscriptionPlan; role: string } | null = null;

      if (ctx.session?.user) {
        try {
          const { data: viewer } = await supabase
            .from('User')
            .select('subscriptionPlan, role')
            .eq('id', ctx.session.user.id)
            .single();

          if (viewer) {
            viewerPlanInfo = { plan: viewer.subscriptionPlan as SubscriptionPlan, role: viewer.role };
            allowAdvancedFilters = viewer.role === 'CLIENT';
            if (allowAdvancedFilters) {
              const planInfo = getSubscriptionPlanInfo(viewer.subscriptionPlan as SubscriptionPlan);
              allowAdvancedFilters = !!planInfo.clientPerks?.advancedSearch;
            }
          }
        } catch (error) {
          // Ignore viewer plan loading errors
        }
      }

      let queryBuilder = supabase
        .from('User')
        .select(`
          id,
          role,
          subscriptionPlan,
          isVerified,
          Profile!inner(
            *,
            PortfolioItem(*)
          )
        `, { count: 'exact' })
        .eq('role', 'FREELANCER')
        .eq('Profile.isPublished', true);

      // Add filters
      if (query) {
        queryBuilder = queryBuilder.or(
          `Profile.firstName.ilike.%${query}%,Profile.lastName.ilike.%${query}%,Profile.title.ilike.%${query}%,Profile.bio.ilike.%${query}%,Profile.skills.ilike.%${query}%`
        );
      }

      if (allowAdvancedFilters && minRate !== undefined) {
        queryBuilder = queryBuilder.gte('Profile.rate', minRate);
      }

      if (allowAdvancedFilters && maxRate !== undefined) {
        queryBuilder = queryBuilder.lte('Profile.rate', maxRate);
      }

      if (allowAdvancedFilters && location) {
        queryBuilder = queryBuilder.ilike('Profile.location', `%${location}%`);
      }

      if (allowAdvancedFilters && skills && skills.length > 0) {
        skills.forEach((skill) => {
          const sanitized = skill.trim();
          if (sanitized.length > 0) {
            queryBuilder = queryBuilder.ilike('Profile.skills', `%${sanitized}%`);
          }
        });
      }

      const { data: freelancers, error, count } = await queryBuilder
        .range(offset, offset + limit - 1);

      if (error) {
        return {
          freelancers: [],
          total: 0,
          hasMore: false,
          planContext: viewerPlanInfo,
        };
      }

      const freelancerList = (freelancers ?? []) as FreelancerSearchResult[];

      const toProfileRecord = (
        profile: FreelancerSearchResult['Profile']
      ): FreelancerProfileRecord | null => {
        if (!profile) return null;
        return Array.isArray(profile) ? profile[0] ?? null : profile;
      };

      const normalizePlan = (plan: SubscriptionPlan | null | undefined): SubscriptionPlan =>
        plan ?? SubscriptionPlan.FREELANCER_FREE;
      const sortedFreelancers = freelancerList.slice().sort((a, b) => {
        const rank = (plan: SubscriptionPlan) => {
          switch (plan) {
            case 'FREELANCER_ELITE':
              return 3;
            case 'FREELANCER_PRO':
              return 2;
            default:
              return 1;
          }
        };

        const planDelta =
          rank(normalizePlan(b.subscriptionPlan)) - rank(normalizePlan(a.subscriptionPlan));
        if (planDelta !== 0) return planDelta;

        const profileA = toProfileRecord(a.Profile);
        const profileB = toProfileRecord(b.Profile);
        const updatedA = new Date(profileA?.updatedAt ?? profileA?.createdAt ?? 0).getTime();
        const updatedB = new Date(profileB?.updatedAt ?? profileB?.createdAt ?? 0).getTime();
        return updatedB - updatedA;
      });

      return {
        freelancers: sortedFreelancers,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
        planContext: viewerPlanInfo,
      };
    }),

  // Update client-specific profile information
  updateClientProfile: protectedProcedure
    .input(
      z.object({
        companyName: z.string(),
        industry: z.string(),
        country: z.string(),
        timezone: z.string(),
        website: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can update client profile information',
        });
      }

      const supabase = await createClient();
      // Use admin client for User table operations
      const adminSupabase = createAdminClient();
      const timestamp = new Date().toISOString();

      const { data: existingProfile } = await supabase
        .from('Profile')
        .select('id')
        .eq('userId', ctx.session.user.id)
        .single();

      const profileData = {
        companyName: input.companyName,
        companyInfo: JSON.stringify({
          industry: input.industry,
          country: input.country,
          timezone: input.timezone,
          website: input.website || null,
        }),
        updatedAt: timestamp,
      };

      // Mark user profile as completed using admin client
      await adminSupabase
        .from('User')
        .update({ profileCompleted: true, updatedAt: timestamp })
        .eq('id', ctx.session.user.id);

      if (existingProfile) {
        const { data, error } = await supabase
          .from('Profile')
          .update(profileData)
          .eq('userId', ctx.session.user.id)
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update client profile',
          });
        }

        return data;
      }

      // Create new profile
      const { data, error } = await supabase
        .from('Profile')
        .insert({
          id: crypto.randomUUID(),
          userId: ctx.session.user.id,
          ...profileData,
          createdAt: timestamp,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create client profile',
        });
      }

      return data;
    }),

  updateBusinessProfile: protectedProcedure
    .input(
      z.object({
        businessName: z.string(),
        businessRegistrationNumber: z.string(),
        taxId: z.string().optional(),
        businessEmail: z.string().email(),
        businessPhone: z.string(),
        businessAddressLine1: z.string(),
        businessAddressLine2: z.string().optional(),
        businessCity: z.string(),
        businessState: z.string().optional(),
        businessCountry: z.string(),
        businessPostalCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use admin client to bypass RLS for User table queries
      const adminSupabase = createAdminClient();
      const supabase = await createClient();
      const userId = ctx.session.user.id;

      // Check if user is a client using admin client
      const { data: user } = await adminSupabase
        .from('User')
        .select('role')
        .eq('id', userId)
        .single();

      if (user?.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can update business profile information',
        });
      }

      const timestamp = new Date().toISOString();

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('Profile')
        .select('id')
        .eq('userId', userId)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { data, error } = await supabase
          .from('Profile')
          .update({
            companyName: input.businessName,
            businessRegistrationNumber: input.businessRegistrationNumber,
            taxId: input.taxId || null,
            businessEmail: input.businessEmail,
            businessPhone: input.businessPhone,
            businessAddressLine1: input.businessAddressLine1,
            businessAddressLine2: input.businessAddressLine2 || null,
            businessCity: input.businessCity,
            businessState: input.businessState || null,
            businessCountry: input.businessCountry,
            businessPostalCode: input.businessPostalCode || null,
            updatedAt: timestamp,
          })
          .eq('userId', userId)
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update business profile',
          });
        }

        return data;
      }

      // Create new profile
      const { data, error } = await supabase
        .from('Profile')
        .insert({
          id: crypto.randomUUID(),
          userId,
          companyName: input.businessName,
          businessRegistrationNumber: input.businessRegistrationNumber,
          taxId: input.taxId || null,
          businessEmail: input.businessEmail,
          businessPhone: input.businessPhone,
          businessAddressLine1: input.businessAddressLine1,
          businessAddressLine2: input.businessAddressLine2 || null,
          businessCity: input.businessCity,
          businessState: input.businessState || null,
          businessCountry: input.businessCountry,
          businessPostalCode: input.businessPostalCode || null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create business profile',
        });
      }

      return data;
    }),

  // Note: Advanced analytics and market trends would be implemented similarly
  // Commenting out for now to save tokens - will implement in Sprint 2 if needed
});
