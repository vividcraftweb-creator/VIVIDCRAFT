import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

function getDbClient() {
  try {
    const admin = createAdminClient();
    if (admin) return admin;
  } catch {}
  return null;
}

export const artworksRouter = router({
  getMyArtworks: protectedProcedure.query(async ({ ctx }) => {
    const admin = getDbClient();
    const supabase = admin || (await createClient());

    const { data: artworks, error } = await supabase
      .from('artworks')
      .select('*')
      .eq('artist_id', ctx.session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getMyArtworks error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch artworks',
      });
    }

    if (!artworks || artworks.length === 0) {
      return [];
    }

    const artworkIds = artworks.map((a: any) => a.id);

    // Fetch likes count
    const { data: likes } = await supabase
      .from('artwork_likes')
      .select('artwork_id')
      .in('artwork_id', artworkIds);

    // Fetch ratings
    const { data: ratings } = await supabase
      .from('artwork_ratings')
      .select('artwork_id, rating')
      .in('artwork_id', artworkIds);

    return artworks.map((art: any) => {
      const artLikes = (likes || []).filter((l: any) => l.artwork_id === art.id);
      const artRatings = (ratings || []).filter((r: any) => r.artwork_id === art.id);
      const ratingsSum = artRatings.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
      const avgRating = artRatings.length > 0 ? Math.round((ratingsSum / artRatings.length) * 10) / 10 : 0;

      return {
        id: art.id,
        artist_id: art.artist_id,
        title: art.title,
        image_url: art.image_url,
        created_at: art.created_at,
        likesCount: artLikes.length,
        ratingsCount: artRatings.length,
        averageRating: avgRating,
      };
    });
  }),

  createArtwork: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, 'Title is required'),
        imageUrl: z.string().url('A valid image URL is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const admin = getDbClient();
      const supabase = admin || (await createClient());
      const id = crypto.randomUUID();

      const { data, error } = await supabase
        .from('artworks')
        .insert({
          id,
          artist_id: ctx.session.user.id,
          title: input.title.trim(),
          image_url: input.imageUrl,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('createArtwork error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create artwork',
        });
      }

      return data;
    }),

  deleteArtwork: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const admin = getDbClient();
      const supabase = admin || (await createClient());

      // Delete child likes and ratings first
      await supabase.from('artwork_likes').delete().eq('artwork_id', input.id);
      await supabase.from('artwork_ratings').delete().eq('artwork_id', input.id);

      const { error } = await supabase
        .from('artworks')
        .delete()
        .eq('id', input.id)
        .eq('artist_id', ctx.session.user.id);

      if (error) {
        console.error('deleteArtwork error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete artwork',
        });
      }

      return { success: true };
    }),

  getArtistArtworks: publicProcedure
    .input(z.object({ artistId: z.string() }))
    .query(async ({ ctx, input }) => {
      const admin = getDbClient();
      const supabase = admin || (await createClient());
      const viewerId = ctx.session?.user?.id || null;

      const { data: artworks, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', input.artistId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('getArtistArtworks error:', error);
        return [];
      }

      if (!artworks || artworks.length === 0) {
        return [];
      }

      const artworkIds = artworks.map((a: any) => a.id);

      // Fetch likes
      const { data: likes } = await supabase
        .from('artwork_likes')
        .select('artwork_id, user_id')
        .in('artwork_id', artworkIds);

      // Fetch ratings
      const { data: ratings } = await supabase
        .from('artwork_ratings')
        .select('artwork_id, user_id, rating')
        .in('artwork_id', artworkIds);

      return artworks.map((art: any) => {
        const artLikes = (likes || []).filter((l: any) => l.artwork_id === art.id);
        const artRatings = (ratings || []).filter((r: any) => r.artwork_id === art.id);

        const isLiked = viewerId ? artLikes.some((l: any) => l.user_id === viewerId) : false;
        const userRatingRow = viewerId ? artRatings.find((r: any) => r.user_id === viewerId) : null;
        const userRating = userRatingRow ? Number(userRatingRow.rating) : null;

        const ratingsSum = artRatings.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
        const avgRating = artRatings.length > 0 ? Math.round((ratingsSum / artRatings.length) * 10) / 10 : 0;

        return {
          id: art.id,
          artist_id: art.artist_id,
          title: art.title,
          image_url: art.image_url,
          created_at: art.created_at,
          likesCount: artLikes.length,
          isLiked,
          ratingsCount: artRatings.length,
          averageRating: avgRating,
          userRating,
        };
      });
    }),

  toggleLike: protectedProcedure
    .input(z.object({ artworkId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const admin = getDbClient();
      const supabase = admin || (await createClient());
      const userId = ctx.session.user.id;

      // Check existing like
      const { data: existingLike } = await supabase
        .from('artwork_likes')
        .select('id')
        .eq('artwork_id', input.artworkId)
        .eq('user_id', userId)
        .maybeSingle();

      let liked = false;

      if (existingLike) {
        // Unlike
        await supabase
          .from('artwork_likes')
          .delete()
          .eq('id', existingLike.id);
        liked = false;
      } else {
        // Like
        const newId = crypto.randomUUID();
        const { error: insErr } = await supabase
          .from('artwork_likes')
          .insert({
            id: newId,
            artwork_id: input.artworkId,
            user_id: userId,
            created_at: new Date().toISOString(),
          });

        if (insErr) {
          console.error('toggleLike insert error:', insErr);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to like artwork',
          });
        }
        liked = true;
      }

      // Get updated total count
      const { count } = await supabase
        .from('artwork_likes')
        .select('*', { count: 'exact', head: true })
        .eq('artwork_id', input.artworkId);

      return {
        liked,
        likesCount: count ?? 0,
      };
    }),

  rateArtwork: protectedProcedure
    .input(
      z.object({
        artworkId: z.string(),
        rating: z.number().int().min(1).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const admin = getDbClient();
      const supabase = admin || (await createClient());
      const userId = ctx.session.user.id;

      // Check existing rating
      const { data: existingRating } = await supabase
        .from('artwork_ratings')
        .select('id')
        .eq('artwork_id', input.artworkId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRating) {
        // Update existing rating
        const { error: updateErr } = await supabase
          .from('artwork_ratings')
          .update({
            rating: input.rating,
          })
          .eq('id', existingRating.id);

        if (updateErr) {
          console.error('rateArtwork update error:', updateErr);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update rating',
          });
        }
      } else {
        // Insert new rating
        const newId = crypto.randomUUID();
        const { error: insErr } = await supabase
          .from('artwork_ratings')
          .insert({
            id: newId,
            artwork_id: input.artworkId,
            user_id: userId,
            rating: input.rating,
            created_at: new Date().toISOString(),
          });

        if (insErr) {
          console.error('rateArtwork insert error:', insErr);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to submit rating',
          });
        }
      }

      // Re-calculate average and count
      const { data: allRatings } = await supabase
        .from('artwork_ratings')
        .select('rating')
        .eq('artwork_id', input.artworkId);

      const ratingsList = allRatings || [];
      const sum = ratingsList.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
      const avg = ratingsList.length > 0 ? Math.round((sum / ratingsList.length) * 10) / 10 : 0;

      return {
        userRating: input.rating,
        averageRating: avg,
        ratingsCount: ratingsList.length,
      };
    }),
});
