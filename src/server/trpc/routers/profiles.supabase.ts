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
  userId?: string;
  firstName?: string | null;
  lastName?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  professional_title?: string | null;
  location?: string | null;
  address?: string | null;
  skills?: string | null;
  rate?: number | null;
  bio?: string | null;
  description?: string | null;
  profilePicture?: string | null;
  avatar_url?: string | null;
  slug?: string | null;
  isPublished?: boolean;
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

async function findProfileSafely(supabase: any, userIdOrId: string, select = '*') {
  try {
    const { data } = await supabase
      .from('profiles')
      .select(select)
      .eq('id', userIdOrId)
      .maybeSingle();
    if (data) return data;
  } catch {}

  try {
    const { data } = await supabase
      .from('profiles')
      .select(select)
      .eq('user_id', userIdOrId)
      .maybeSingle();
    if (data) return data;
  } catch {}

  return null;
}

export const profilesRouter = router({
  getProfile: publicProcedure
    .input(z.object({ id: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!input?.id) {
        return null;
      }

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
        return null;
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

      const profile = await findProfileSafely(supabase, userId);

      if (!profile) {
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
        void (supabase as any)
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
        firstName: profile.firstName || profile.first_name || '',
        lastName: profile.lastName || profile.last_name || '',
        location: profile.location || profile.address || '',
        skills: profile.skills || '',
        slug: selectedProfile.slug ?? SecureId.encode(userId),
      };
    }),

  getMyProfile: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.session?.user?.id) {
        return null;
      }

      // Use admin client to bypass RLS for fetching user's own profile
      const supabase = createAdminClient();
      let data = await findProfileSafely(supabase, ctx.session.user.id);

      try {
        const { data: pData } = await (supabase as any)
          .from('Profile')
          .select('*')
          .eq('userId', ctx.session.user.id)
          .maybeSingle();
        if (pData) {
          data = { ...pData, ...(data || {}) };
        }
      } catch {}

      if (!data) {
        // Fallback for newly created or active session user
        const userName = ctx.session.user.name || '';
        const nameParts = userName.split(' ');
        data = {
          id: ctx.session.user.id,
          userId: ctx.session.user.id,
          first_name: nameParts[0] || 'studio',
          last_name: nameParts.slice(1).join(' ') || 'One',
          role: 'artist',
        };
      }

      return {
        ...data,
        firstName: data.firstName || data.first_name || data.full_name?.split(' ')[0] || '',
        lastName: data.lastName || data.last_name || (data.full_name ? data.full_name.split(' ').slice(1).join(' ') : '') || '',
        location: data.location || data.address || '',
        address: data.address || data.location || '',
        skills: data.skills || '',
        title: data.title || '',
        bio: data.bio || data.description || '',
        profilePicture: data.profilePicture || data.profile_picture || data.avatar_url || '',
        avatar_url: data.avatar_url || data.profile_picture || data.profilePicture || '',
        isPublished: data.is_published ?? data.isPublished ?? false,
      };
    } catch (err) {
      console.error('getMyProfile error:', err);
      return null;
    }
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional().nullable(),
        lastName: z.string().optional().nullable(),
        title: z.string().optional().nullable(),
        bio: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        whatsappNumber: z.string().optional().nullable(),
        location: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        businessEmail: z.string().optional().nullable(),
        businessPhone: z.string().optional().nullable(),
        businessAddressLine1: z.string().optional().nullable(),
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
        gallery_images: z.array(z.string()).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate environment variables
      const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
      const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

      if (!supabaseUrl || !supabaseKey) {
        console.error('PROFILE UPDATE ERROR: Supabase environment variables are missing or undefined');
      }

      // Use authenticated Supabase client from context or admin client
      const supabase = ctx.supabase || ctx.adminSupabase || createAdminClient();

      const existingProfile = await findProfileSafely(supabase, ctx.session.user.id);

      const timestamp = new Date().toISOString();

      const firstName = input.firstName ?? existingProfile?.firstName ?? existingProfile?.first_name ?? '';
      const lastName = input.lastName ?? existingProfile?.lastName ?? existingProfile?.last_name ?? '';

      let slugToPersist: string | null = existingProfile?.slug ?? null;
      try {
        if (input.firstName || input.lastName) {
          slugToPersist = (await generateProfileSlug(
            supabase,
            input.firstName ?? existingProfile?.firstName ?? existingProfile?.first_name,
            input.lastName ?? existingProfile?.lastName ?? existingProfile?.last_name,
            existingProfile?.id
          )) || existingProfile?.slug;
        }
      } catch (slugError) {
        console.warn('PROFILE SLUG WARNING:', slugError);
        slugToPersist = existingProfile?.slug || `user-${ctx.session.user.id.slice(0, 8)}`;
      }

      const upsertPayload: Record<string, any> = {
        id: ctx.session.user.id,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        title: input.title !== undefined ? input.title : existingProfile?.title,
        bio: input.bio !== undefined ? input.bio : existingProfile?.bio,
        address: (input.address || input.location) !== undefined ? (input.address || input.location) : (existingProfile?.address || existingProfile?.location),
        whatsapp_number: (input.whatsappNumber || input.phone) !== undefined ? (input.whatsappNumber || input.phone) : (existingProfile?.whatsapp_number || existingProfile?.phone),
        email: (input.email || input.businessEmail) !== undefined ? (input.email || input.businessEmail) : (existingProfile?.email || existingProfile?.businessEmail),
        skills: input.skills !== undefined ? input.skills : existingProfile?.skills,
        slug: slugToPersist,
        updated_at: timestamp,
      };

      // Remove undefined keys
      Object.keys(upsertPayload).forEach((key) => upsertPayload[key] === undefined && delete upsertPayload[key]);

      const { data, error } = await (supabase as any)
        .from('profiles')
        .upsert(upsertPayload)
        .select()
        .single();

      if (error) {
        console.error('PROFILE UPDATE ERROR:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update profile',
        });
      }

      return data;
    }),

  getContacts: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      return [];
    }
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

  getTokenData: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      return null;
    }
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

  getTokenLog: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      return [];
    }
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
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { query, minRate, maxRate, location, limit = 20, offset = 0, skills } = input || {};
      // Use admin client to bypass RLS for fetching published profiles
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

      // 1. Fetch from `profiles` table
      const profilesMap = new Map<string, any>();
      try {
        const { data: pRows } = await (supabase as any).from('profiles').select('*');
        if (pRows && Array.isArray(pRows)) {
          pRows.forEach((p: any) => {
            if (p.id) profilesMap.set(p.id, p);
          });
        }
      } catch (err) {}

      // 2. Fetch from legacy `Profile` table
      try {
        const { data: legacyProfiles } = await supabase.from('Profile').select('*');
        if (legacyProfiles && Array.isArray(legacyProfiles)) {
          legacyProfiles.forEach((lp: any) => {
            const key = lp.userId || lp.id;
            if (key) {
              const existing = profilesMap.get(key) || {};
              profilesMap.set(key, {
                id: key,
                ...existing,
                ...lp,
                first_name: existing.first_name || lp.firstName || '',
                last_name: existing.last_name || lp.lastName || '',
                title: existing.title || lp.title || '',
                bio: existing.bio || lp.bio || '',
                location: existing.location || existing.address || lp.location || '',
                address: existing.address || existing.location || lp.location || '',
                skills: existing.skills || lp.skills || '',
                rate: typeof existing.rate === 'number' ? existing.rate : lp.rate,
                avatar_url: existing.avatar_url || lp.profilePicture || '',
                profilePicture: existing.avatar_url || lp.profilePicture || '',
                slug: existing.slug || lp.slug || key,
              });
            }
          });
        }
      } catch (err) {}

      // 3. Fetch from `User` table to get role, email, isVerified, subscriptionPlan
      try {
        const { data: userRows } = await supabase.from('User').select('*');
        if (userRows && Array.isArray(userRows)) {
          userRows.forEach((u: any) => {
            const key = u.id;
            if (key) {
              const existing = profilesMap.get(key) || {};
              profilesMap.set(key, {
                id: key,
                email: u.email || existing.email,
                role: u.role || existing.role || 'FREELANCER',
                subscriptionPlan: u.subscriptionPlan || existing.subscriptionPlan || 'FREELANCER_PRO',
                is_verified: u.isVerified ?? existing.is_verified ?? true,
                ...existing,
              });
            }
          });
        }
      } catch (err) {}

      // 4. Enrich with Supabase Auth users
      try {
        const { data: authData } = await supabase.auth.admin.listUsers();
        if (authData?.users) {
          for (const u of authData.users) {
            const meta = (u as any).user_metadata || {};
            const appMeta = (u as any).app_metadata || {};
            const key = u.id;
            const existing = profilesMap.get(key) || {};

            const fName = meta.first_name || meta.firstName || (meta.name ? meta.name.split(' ')[0] : '') || existing.first_name || existing.firstName || '';
            const lName = meta.last_name || meta.lastName || (meta.name ? meta.name.split(' ').slice(1).join(' ') : '') || existing.last_name || existing.lastName || '';
            const avUrl = meta.avatar_url || meta.profilePicture || meta.profile_picture || existing.avatar_url || existing.profilePicture || null;
            const ttl = meta.title || meta.professional_title || existing.title || existing.professional_title || '';
            const b = meta.bio || meta.description || existing.bio || existing.description || '';
            const loc = meta.address || meta.location || existing.address || existing.location || '';
            const sk = meta.skills || existing.skills || '';
            const uRole = (existing.role || meta.role || appMeta.role || 'FREELANCER').toUpperCase();

            profilesMap.set(key, {
              id: key,
              email: u.email || existing.email,
              role: uRole,
              subscriptionPlan: existing.subscriptionPlan || 'FREELANCER_PRO',
              is_verified: existing.is_verified ?? true,
              ...existing,
              first_name: fName,
              last_name: lName,
              avatar_url: avUrl,
              profilePicture: avUrl,
              title: ttl,
              professional_title: ttl,
              bio: b,
              description: b,
              location: loc,
              address: loc,
              skills: sk,
            });
          }
        }
      } catch (authErr) {
        console.warn("Auth users enrich notice:", authErr);
      }

      const allProfiles = Array.from(profilesMap.values());

      // Apply search and filter criteria (strictly excluding clients, buyers, admins)
      const filteredProfiles = allProfiles.filter((p: any) => {
        const role = String(p.role || p.user_type || p.account_type || p.userType || p.user_metadata?.role || '').toLowerCase().trim();
        if (role === 'client' || role === 'buyer' || role === 'admin' || role === 'employer') return false;

        const fName = p.first_name || p.firstName || p.full_name?.split(' ')[0] || '';
        const lName = p.last_name || p.lastName || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : '') || '';
        const rawSkills = p.skills || '';
        const skillsVal = Array.isArray(rawSkills) ? rawSkills.join(', ') : (typeof rawSkills === 'string' ? rawSkills : '');
        const titleVal = p.title || p.professional_title || '';
        const bioVal = p.bio || p.description || '';
        const locVal = p.address || p.location || '';
        const emailVal = p.email || '';
        const rateVal = typeof p.rate === 'number' ? p.rate : (typeof p.hourly_rate === 'number' ? p.hourly_rate : null);

        if (query) {
          const q = query.toLowerCase();
          const textMatch = `${fName} ${lName} ${emailVal} ${titleVal} ${bioVal} ${skillsVal} ${locVal}`.toLowerCase().includes(q);
          if (!textMatch) return false;
        }

        if (allowAdvancedFilters && location && locVal) {
          if (!locVal.toLowerCase().includes(location.toLowerCase())) return false;
        }

        if (allowAdvancedFilters && skills && skills.length > 0) {
          const hasSkill = skills.some(s => skillsVal.toLowerCase().includes(s.toLowerCase()));
          if (!hasSkill) return false;
        }

        if (allowAdvancedFilters && minRate !== undefined && rateVal !== null) {
          if (rateVal < minRate) return false;
        }

        if (allowAdvancedFilters && maxRate !== undefined && rateVal !== null) {
          if (rateVal > maxRate) return false;
        }

        return true;
      });

      const toProfileRecord = (
        profile: FreelancerSearchResult['Profile']
      ): FreelancerProfileRecord | null => {
        if (!profile) return null;
        return Array.isArray(profile) ? profile[0] ?? null : profile;
      };

      const normalizePlan = (plan: SubscriptionPlan | null | undefined): SubscriptionPlan =>
        plan ?? SubscriptionPlan.FREELANCER_PRO;

      // Transform into FreelancerSearchResult
      const freelancerList: FreelancerSearchResult[] = filteredProfiles.map((p: any) => {
        const fName = p.first_name || p.firstName || p.full_name?.split(' ')[0] || '';
        const lName = p.last_name || p.lastName || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : '') || '';
        const rawSkills = p.skills || '';
        const skillsVal = Array.isArray(rawSkills) ? rawSkills.join(', ') : (typeof rawSkills === 'string' ? rawSkills : '');
        const titleVal = p.title || p.professional_title || '';
        const bioVal = p.bio || p.description || '';
        const locVal = p.address || p.location || '';
        const rateVal = typeof p.rate === 'number' ? p.rate : (typeof p.hourly_rate === 'number' ? p.hourly_rate : null);
        const avatarVal = p.avatar_url || p.profile_picture || p.profilePicture || null;
        const slugVal = p.slug || p.id;

        return {
          id: p.id,
          email: p.email || null,
          role: p.role || 'FREELANCER',
          subscriptionPlan: p.subscription_plan || p.subscriptionPlan || 'FREELANCER_PRO',
          isVerified: Boolean(p.is_verified || p.isVerified || (p.verified ?? true)),
          Profile: {
            id: p.id,
            userId: p.id,
            firstName: fName,
            lastName: lName,
            first_name: fName,
            last_name: lName,
            title: titleVal,
            professional_title: titleVal,
            bio: bioVal,
            description: bioVal,
            location: locVal,
            address: locVal,
            skills: skillsVal,
            profilePicture: avatarVal,
            avatar_url: avatarVal,
            slug: slugVal,
            rate: rateVal,
            isPublished: true,
            PortfolioItem: [],
            createdAt: p.created_at || new Date().toISOString(),
            updatedAt: p.updated_at || new Date().toISOString(),
          },
        };
      });

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

      const total = sortedFreelancers.length;
      const paginatedList = sortedFreelancers.slice(offset, offset + limit);

      return {
        freelancers: paginatedList,
        total: total,
        hasMore: total > offset + limit,
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

      const existingProfile = await findProfileSafely(supabase, ctx.session.user.id, 'id');

      const profileData = {
        companyName: input.companyName,
        companyInfo: JSON.stringify({
          industry: input.industry,
          country: input.country,
          timezone: input.timezone,
          website: input.website || null,
        }),
        updated_at: timestamp,
      };

      // Mark user profile as completed using admin client
      await adminSupabase
        .from('User')
        .update({ profileCompleted: true, updatedAt: timestamp })
        .eq('id', ctx.session.user.id);

      if (existingProfile) {
        const { data, error } = await (supabase as any)
          .from('profiles')
          .update(profileData)
          .eq('id', existingProfile.id)
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
      const { data, error } = await (supabase as any)
        .from('profiles')
        .insert({
          id: ctx.session.user.id,
          ...profileData,
          created_at: timestamp,
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
      const existingProfile = await findProfileSafely(supabase, userId, 'id');

      const businessPayload = {
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
        updated_at: timestamp,
      };

      if (existingProfile) {
        // Update existing profile
        const { data, error } = await (supabase as any)
          .from('profiles')
          .update(businessPayload)
          .eq('id', existingProfile.id)
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
      const { data, error } = await (supabase as any)
        .from('profiles')
        .insert({
          id: userId,
          ...businessPayload,
          created_at: timestamp,
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
