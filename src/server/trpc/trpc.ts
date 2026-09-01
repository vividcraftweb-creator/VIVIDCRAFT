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

  // If user is ADMIN or mock dev admin, allow immediately
  if (ctx.session.user.role === 'ADMIN') {
    return next({
      ctx: {
        ...ctx,
        session: {
          user: ctx.session.user,
          accessToken: ctx.session.accessToken || '',
          refreshToken: ctx.session.refreshToken || '',
          expires: ctx.session.expires || new Date(Date.now() + 3600000).toISOString(),
        },
      },
    });
  }

  // Check if user's email is verified using Supabase Auth
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!error && user && !user.email_confirmed_at && ctx.session.user.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Please verify your email address to access this feature.'
      });
    }
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    // On Supabase connection/env errors, proceed with valid session
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
  return createAdminClient();
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
