import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';
import superjson from 'superjson';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const isAuthed = t.middleware(async ({ next, ctx }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated. Please sign in.'
    });
  }

  // Check if user's email is verified using Supabase Auth
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication failed.'
    });
  }

  // Check if email is confirmed in Supabase Auth
  if (!user.email_confirmed_at && ctx.session.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Please verify your email address to access this feature.'
    });
  }

  return next({
    ctx: {
      ...ctx,
      // infers that `user` is non-nullable to downstream procedures
      session: {
        user: ctx.session.user,
        accessToken: ctx.session.accessToken || '',
        refreshToken: ctx.session.refreshToken || '',
        expires: ctx.session.expires || new Date(Date.now() + 3600000).toISOString(),
      },
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);

const getAdminSupabaseClient = (): SupabaseClient<Database> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'Admin features require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables. Please set them and restart the server.',
    });
  }

  try {
    return createAdminClient();
  } catch (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to initialize admin Supabase client.',
    });
  }
};

const adminGuard = isAuthed.unstable_pipe(({ ctx, next }) => {
  if (ctx.session.user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }

  return next({
    ctx: {
      ...ctx,
    },
  });
});

const isAdmin = adminGuard.unstable_pipe(({ ctx, next }) => {
  if (!ctx.session.user?.role || ctx.session.user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }

  const adminSupabase = getAdminSupabaseClient();

  return next({
    ctx: {
      ...ctx,
      adminSupabase,
    },
  });
});

export const adminProcedure = t.procedure.use(isAdmin);
