import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

export const chatConnectionsRouter = router({
  requestConnection: protectedProcedure
    .input(z.object({ partnerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const adminClient = createAdminClient();

      const { data: user } = await adminClient
        .from('User')
        .select('role')
        .eq('id', ctx.session.user.id)
        .single();

      const { data: partner } = await adminClient
        .from('User')
        .select('role')
        .eq('id', input.partnerId)
        .single();

      if (!user || !partner) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      let clientId = ctx.session.user.id;
      let artistId = input.partnerId;

      if (user.role === 'FREELANCER') {
        artistId = ctx.session.user.id;
        clientId = input.partnerId;
      }

      // Check if connection already exists
      const { data: existing } = await adminClient
        .from('ChatConnection')
        .select('*')
        .eq('clientId', clientId)
        .eq('artistId', artistId)
        .maybeSingle();

      if (existing) {
        return existing;
      }

      // Create new disabled connection
      const { data, error } = await adminClient
        .from('ChatConnection')
        .insert({
          clientId,
          artistId,
          chatEnabled: false,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to request chat connection',
        });
      }

      return data;
    }),
});
