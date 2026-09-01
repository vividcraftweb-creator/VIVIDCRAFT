import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

export const artworksRouter = router({
  getMyArtworks: protectedProcedure.query(async ({ ctx }) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('Artwork')
      .select('*')
      .eq('artistId', ctx.session.user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch artworks',
      });
    }

    return data;
  }),

  createArtwork: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      imageUrl: z.string().url(),
      price: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();
      const id = crypto.randomUUID();

      const { data, error } = await supabase
        .from('Artwork')
        .insert({
          id,
          artistId: ctx.session.user.id,
          title: input.title,
          description: input.description,
          imageUrl: input.imageUrl,
          price: input.price,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create artwork',
        });
      }

      return data;
    }),

  updateArtwork: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('Artwork')
        .update(updates)
        .eq('id', id)
        .eq('artistId', ctx.session.user.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update artwork',
        });
      }

      return data;
    }),

  deleteArtwork: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();
      
      const { error } = await supabase
        .from('Artwork')
        .delete()
        .eq('id', input.id)
        .eq('artistId', ctx.session.user.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete artwork',
        });
      }

      return { success: true };
    }),
});
