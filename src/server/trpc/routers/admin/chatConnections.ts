import { router, adminProcedure } from '../../trpc';
import { z } from 'zod';

export const adminChatConnectionsRouter = router({
  getConnections: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const supabase = ctx.adminSupabase;
        if (!supabase) {
          return { items: [], total: 0, hasMore: false };
        }

        let { data, error, count } = await supabase
          .from('ChatConnection')
          .select(`
            *,
            client:User!ChatConnection_clientId_fkey(
              id,
              email,
              Profile(firstName, lastName)
            ),
            artist:User!ChatConnection_artistId_fkey(
              id,
              email,
              Profile(firstName, lastName)
            )
          `, { count: 'exact' })
          .order('createdAt', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) {
          console.error('getConnections error, trying plain select:', error);
          const fallbackRes = await supabase
            .from('ChatConnection')
            .select('*', { count: 'exact' })
            .order('createdAt', { ascending: false })
            .range(input.offset, input.offset + input.limit - 1);
          data = fallbackRes.data as any;
          count = fallbackRes.count;
        }

        return {
          items: data || [],
          total: count || 0,
          hasMore: count ? count > input.offset + input.limit : false,
        };
      } catch (err) {
        console.error('getConnections exception:', err);
        return { items: [], total: 0, hasMore: false };
      }
    }),

  toggleConnection: adminProcedure
    .input(z.object({ id: z.string(), chatEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = ctx.adminSupabase;
      if (!supabase) throw new Error('Supabase admin client not found');

      const { error } = await supabase
        .from('ChatConnection')
        .update({ chatEnabled: input.chatEnabled })
        .eq('id', input.id);

      if (error) throw new Error(error.message);

      return { success: true };
    }),
});
