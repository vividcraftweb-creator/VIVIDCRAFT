import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

import { getAuthenticatedClient } from '@/lib/supabase/authenticated-client';

export const artworksRouter = router({
  getMyArtworks: protectedProcedure.query(async ({ ctx }) => {
    const artistId = ctx.session.user?.id || (ctx as any).user?.id;
    if (!artistId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authenticated session user ID not found',
      });
    }

    const supabase = await getAuthenticatedClient(ctx);

    const { data: artworks, error } = await supabase
      .from('artworks')
      .select('*')
      .eq('artist_id', artistId)
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
      // 1. Ensure artist_id uses the authenticated session user's ID
      const artistId = ctx.session.user?.id || (ctx as any).user?.id;
      if (!artistId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authenticated session user ID not found',
        });
      }

      // 2. Get Supabase client configured with the authenticated user context
      const supabase = await getAuthenticatedClient(ctx);
      const id = crypto.randomUUID();

      const { data, error } = await supabase
        .from('artworks')
        .insert({
          id,
          artist_id: artistId,
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
      const artistId = ctx.session.user?.id || (ctx as any).user?.id;
      if (!artistId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authenticated session user ID not found',
        });
      }

      const supabase = await getAuthenticatedClient(ctx);

      // Delete child likes and ratings first
      await supabase.from('artwork_likes').delete().eq('artwork_id', input.id);
      await supabase.from('artwork_ratings').delete().eq('artwork_id', input.id);

      const { error } = await supabase
        .from('artworks')
        .delete()
        .eq('id', input.id)
        .eq('artist_id', artistId);

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
      const supabase = await getAuthenticatedClient(ctx);
      const viewerId = ctx.session?.user?.id || (ctx as any).user?.id || null;

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
      const userId = ctx.session.user?.id || (ctx as any).user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authenticated session user ID not found',
        });
      }

      const supabase = await getAuthenticatedClient(ctx);

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
            message: insErr.message || 'Failed to like artwork',
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
      const userId = ctx.session.user?.id || (ctx as any).user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authenticated session user ID not found',
        });
      }

      const supabase = await getAuthenticatedClient(ctx);

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
            message: updateErr.message || 'Failed to update rating',
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
            message: insErr.message || 'Failed to submit rating',
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

  getArtworkComments: publicProcedure
    .input(z.object({ artworkId: z.string() }))
    .query(async ({ ctx, input }) => {
      const supabase = await getAuthenticatedClient(ctx);

      const { data: comments, error } = await supabase
        .from('artwork_comments')
        .select('*')
        .eq('artwork_id', input.artworkId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('getArtworkComments error:', error);
        return [];
      }

      if (!comments || comments.length === 0) {
        return [];
      }

      // Fetch user profile info for comments
      const userIds = Array.from(new Set(comments.map((c: any) => c.user_id).filter(Boolean)));
      const profilesMap: Record<string, { name: string; avatarUrl: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', userIds);

        if (profiles) {
          profiles.forEach((p: any) => {
            const fName = p.first_name || '';
            const lName = p.last_name || '';
            const name = `${fName} ${lName}`.trim() || 'Art Enthusiast';
            profilesMap[p.id] = {
              name,
              avatarUrl: p.avatar_url || null,
            };
          });
        }
      }

      return comments.map((c: any) => ({
        id: c.id,
        artworkId: c.artwork_id,
        userId: c.user_id,
        comment: c.comment,
        createdAt: c.created_at,
        userName: profilesMap[c.user_id]?.name || 'Art Enthusiast',
        userAvatar: profilesMap[c.user_id]?.avatarUrl || null,
      }));
    }),

  addArtworkComment: protectedProcedure
    .input(
      z.object({
        artworkId: z.string(),
        comment: z.string().trim().min(1, 'Comment cannot be empty').max(1000, 'Comment too long'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user?.id || (ctx as any).user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authenticated session user ID not found',
        });
      }

      const supabase = await getAuthenticatedClient(ctx);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('artwork_comments')
        .insert({
          id,
          artwork_id: input.artworkId,
          user_id: userId,
          comment: input.comment,
          created_at: createdAt,
        })
        .select()
        .single();

      if (error) {
        console.error('addArtworkComment error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to post comment',
        });
      }

      // Fetch user profile info
      let userName = ctx.session.user?.name || 'Art Enthusiast';
      let userAvatar: string | null = null;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          const fName = profile.first_name || '';
          const lName = profile.last_name || '';
          const name = `${fName} ${lName}`.trim();
          if (name) userName = name;
          userAvatar = profile.avatar_url || null;
        }
      } catch {}

      return {
        id: data.id,
        artworkId: data.artwork_id,
        userId: data.user_id,
        comment: data.comment,
        createdAt: data.created_at,
        userName,
        userAvatar,
      };
    }),

  getArtistReviews: publicProcedure
    .input(z.object({ artistId: z.string() }))
    .query(async ({ ctx, input }) => {
      const supabase = await getAuthenticatedClient(ctx);

      const { data: reviews, error } = await supabase
        .from('artist_reviews')
        .select('*')
        .eq('artist_id', input.artistId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('getArtistReviews error:', error);
        return [];
      }

      if (!reviews || reviews.length === 0) {
        return [];
      }

      // Fetch client profile info
      const clientIds = Array.from(new Set(reviews.map((r: any) => r.client_id).filter(Boolean)));
      const profilesMap: Record<string, { name: string; avatarUrl: string | null }> = {};

      if (clientIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', clientIds);

        if (profiles) {
          profiles.forEach((p: any) => {
            const fName = p.first_name || '';
            const lName = p.last_name || '';
            const name = `${fName} ${lName}`.trim() || 'Verified Client';
            profilesMap[p.id] = {
              name,
              avatarUrl: p.avatar_url || null,
            };
          });
        }
      }

      return reviews.map((r: any) => ({
        id: r.id,
        artistId: r.artist_id,
        clientId: r.client_id,
        rating: Number(r.rating) || 5,
        reviewText: r.review_text || '',
        createdAt: r.created_at,
        clientName: profilesMap[r.client_id]?.name || 'Verified Client',
        clientAvatar: profilesMap[r.client_id]?.avatarUrl || null,
      }));
    }),

  addArtistReview: protectedProcedure
    .input(
      z.object({
        artistId: z.string(),
        rating: z.number().int().min(1, 'Rating must be at least 1 star').max(5, 'Rating cannot exceed 5 stars'),
        reviewText: z.string().trim().min(1, 'Review text is required').max(2000, 'Review text is too long'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = ctx.session.user?.id || (ctx as any).user?.id;
      if (!clientId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authenticated session user ID not found',
        });
      }

      if (clientId === input.artistId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Artists cannot submit reviews on their own profile.',
        });
      }

      const supabase = await getAuthenticatedClient(ctx);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('artist_reviews')
        .insert({
          id,
          artist_id: input.artistId,
          client_id: clientId,
          rating: input.rating,
          review_text: input.reviewText,
          created_at: createdAt,
        })
        .select()
        .single();

      if (error) {
        console.error('addArtistReview error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to submit review',
        });
      }

      // Fetch client profile info
      let clientName = ctx.session.user?.name || 'Verified Client';
      let clientAvatar: string | null = null;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', clientId)
          .maybeSingle();

        if (profile) {
          const fName = profile.first_name || '';
          const lName = profile.last_name || '';
          const name = `${fName} ${lName}`.trim();
          if (name) clientName = name;
          clientAvatar = profile.avatar_url || null;
        }
      } catch {}

      return {
        id: data.id,
        artistId: data.artist_id,
        clientId: data.client_id,
        rating: Number(data.rating) || input.rating,
        reviewText: data.review_text,
        createdAt: data.created_at,
        clientName,
        clientAvatar,
      };
    }),
});
