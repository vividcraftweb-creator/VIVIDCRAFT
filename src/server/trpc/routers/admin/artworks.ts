import { router, adminProcedure } from '../../trpc';
import { z } from 'zod';

export const adminArtworksRouter = router({
  getArtworks: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const supabase = ctx.adminSupabase;
        if (!supabase) {
          return { items: [], total: 0, hasMore: false };
        }

        let query = supabase
          .from('Artwork')
          .select(`
            *,
            artist:User!Artwork_artistId_fkey(
              id,
              email,
              Profile(
                firstName,
                lastName
              )
            )
          `, { count: 'exact' });

        if (input.search) {
          query = query.ilike('title', `%${input.search}%`);
        }

        let { data, error, count } = await query
          .order('createdAt', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) {
          console.error('getArtworks error, trying plain select:', error);
          const fallbackRes = await supabase
            .from('Artwork')
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
        console.error('getArtworks exception:', err);
        return { items: [], total: 0, hasMore: false };
      }
    }),

  deleteArtwork: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = ctx.adminSupabase;
      if (!supabase) throw new Error('Supabase admin client not found');

      const { error } = await supabase.from('Artwork').delete().eq('id', input.id);
      if (error) throw new Error(error.message);
      
      return { success: true };
    }),
});
