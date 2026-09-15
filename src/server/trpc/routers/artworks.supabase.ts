import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

import { getAuthenticatedClient } from '@/lib/supabase/authenticated-client';

export const artworksRouter = router({
  getMyArtworks: protectedProcedure.query(async ({ ctx }) => {
    try {
      const artistId = ctx.session.user?.id || (ctx as any).user?.id;
      if (!artistId) {
        return [];
      }

      const supabase = await getAuthenticatedClient(ctx);

      const { data: artworks, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('getMyArtworks query error caught gracefully:', error.message || error);
        return [];
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

      return artworks.map((art: any, index: number) => {
        const artLikes = (likes || []).filter((l: any) => l.artwork_id === art.id);
        const artRatings = (ratings || []).filter((r: any) => r.artwork_id === art.id);
        const ratingsSum = artRatings.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
        const avgRating = artRatings.length > 0 ? Math.round((ratingsSum / artRatings.length) * 10) / 10 : 0;
        const rawCode = art.art_code;
        const artCode = rawCode ? (rawCode.startsWith('#') ? rawCode : `#${rawCode}`) : `#ART-${101 + index}`;

        const pType = String(art.pricing_type || (art as any).selling_type || art.selling_mode || '').toUpperCase().trim();
        const priceNum = Number(art.price ?? (art as any).amount ?? 0);
        const bidNum = Number(art.starting_bid ?? (art as any).startingBid ?? 0);
        const titleLower = String(art.title || '').toLowerCase().trim();

        let evaluatedMode: 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE' = 'NOT_FOR_SALE';
        if (priceNum > 0 || (art as any).amount !== undefined && Number((art as any).amount) > 0 || pType === 'FIXED_PRICE' || pType === 'FOR_SALE' || pType === 'SALE' || (titleLower.includes('sale') && !titleLower.includes('not for sale'))) {
          evaluatedMode = 'FIXED_PRICE';
        } else if (bidNum > 0 || pType === 'BIDDING' || pType === 'AUCTION' || pType === 'BID' || titleLower.includes('bid')) {
          evaluatedMode = 'BIDDING';
        }

        const effectivePrice = evaluatedMode === 'FIXED_PRICE' ? (priceNum > 0 ? priceNum : (art.price ? Number(art.price) : 0)) : null;
        const effectiveBid = evaluatedMode === 'BIDDING' ? (bidNum > 0 ? bidNum : (art.starting_bid ? Number(art.starting_bid) : 0)) : null;

        return {
          id: art.id,
          artist_id: art.artist_id,
          title: art.title,
          description: art.description || null,
          category: art.category || null,
          medium: art.medium || null,
          tags: art.tags || [],
          image_url: art.image_url,
          created_at: art.created_at,
          likesCount: artLikes.length,
          ratingsCount: artRatings.length,
          averageRating: avgRating,
          selling_mode: evaluatedMode,
          pricing_type: evaluatedMode,
          price: effectivePrice,
          starting_bid: effectiveBid,
          art_code: artCode,
        };
      });
    } catch (err) {
      console.warn('getMyArtworks exception caught gracefully:', err);
      return [];
    }
  }),

  createArtwork: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        medium: z.string().nullable().optional(),
        tags: z.union([z.array(z.string()), z.string()]).nullable().optional(),
        imageUrl: z.string().url('A valid image URL is required'),
        sellingMode: z.enum(['FIXED_PRICE', 'BIDDING', 'NOT_FOR_SALE']).default('NOT_FOR_SALE').optional(),
        pricing_type: z.enum(['FIXED_PRICE', 'BIDDING', 'NOT_FOR_SALE']).optional(),
        pricingType: z.enum(['FIXED_PRICE', 'BIDDING', 'NOT_FOR_SALE']).optional(),
        price: z.number().nullable().optional(),
        starting_bid: z.number().nullable().optional(),
        startingBid: z.number().nullable().optional(),
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

      const priceVal = input.price !== undefined && input.price !== null && !isNaN(Number(input.price)) ? Number(input.price) : null;
      const rawBid = input.starting_bid ?? input.startingBid;
      const bidVal = rawBid !== undefined && rawBid !== null && !isNaN(Number(rawBid)) ? Number(rawBid) : null;

      const rawType = input.pricing_type || input.pricingType || input.sellingMode || 'FIXED_PRICE';
      const cleanPricingType = String(rawType).toUpperCase().trim();

      let pricingMode: 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE';
      if (cleanPricingType === 'FIXED_PRICE' || cleanPricingType.includes('FIXED') || cleanPricingType.includes('SALE') || (priceVal !== null && priceVal > 0)) {
        pricingMode = 'FIXED_PRICE';
      } else if (cleanPricingType.includes('BID') || cleanPricingType.includes('AUCTION') || (bidVal !== null && bidVal > 0)) {
        pricingMode = 'BIDDING';
      } else if (cleanPricingType.includes('NOT')) {
        pricingMode = 'NOT_FOR_SALE';
      } else {
        pricingMode = 'FIXED_PRICE';
      }

      const price = pricingMode === 'FIXED_PRICE' && priceVal !== null ? Number(priceVal) : null;
      const startingBid = pricingMode === 'BIDDING' && bidVal !== null ? Number(bidVal) : null;
      const description = input.description?.trim() || null;
      const category = input.category?.trim() || null;
      const medium = input.medium?.trim() || null;
      const tags = Array.isArray(input.tags)
        ? input.tags
        : typeof input.tags === 'string'
        ? input.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      // Generate sequential Artwork ID (e.g., #ART-104)
      let artCode = '#ART-101';
      try {
        const countRes = await supabase.from('artworks').select('*', { count: 'exact', head: true });
        const count = countRes.count || 0;
        artCode = `#ART-${101 + count}`;
      } catch {
        const hash = Math.abs(id.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0)) % 900 + 100;
        artCode = `#ART-${hash}`;
      }

      // Explicit insert query payload strictly including: pricing_type, price, starting_bid, user_id, artist_id, description, category, medium, tags
      const insertPayload = {
        id,
        artist_id: artistId,
        user_id: artistId,
        title: input.title.trim(),
        description,
        category,
        medium,
        tags,
        pricing_type: pricingMode,
        selling_mode: pricingMode,
        price,
        starting_bid: startingBid,
        image_url: input.imageUrl,
        created_at: new Date().toISOString(),
        art_code: artCode,
      };

      let res = await supabase
        .from('artworks')
        .insert(insertPayload)
        .select()
        .single();

      if (res.error) {
        console.error("Supabase Insert Error:", res.error);
        res = await supabase
          .from('artworks')
          .insert({
            id,
            artist_id: artistId,
            title: input.title.trim(),
            description,
            image_url: input.imageUrl,
            created_at: new Date().toISOString(),
            selling_mode: pricingMode,
            pricing_type: pricingMode,
            price,
            starting_bid: startingBid,
            art_code: artCode,
          })
          .select()
          .single();
      }

      if (res.error) {
        console.error("Supabase Insert Error (Fallback 1):", res.error);
        res = await supabase
          .from('artworks')
          .insert({
            id,
            artist_id: artistId,
            title: input.title.trim(),
            description,
            image_url: input.imageUrl,
            created_at: new Date().toISOString(),
            selling_type: pricingMode,
            selling_mode: pricingMode,
            pricing_type: pricingMode,
            price,
            starting_bid: startingBid,
          })
          .select()
          .single();
      }

      if (res.error) {
        console.error("Supabase Insert Error (Fallback 2):", res.error);
        res = await supabase
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
      }

      if (res.error) {
        console.error("Supabase Insert Error (All Fallbacks Failed):", res.error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to insert artwork into database: ${res.error.message}`,
        });
      }

      return {
        ...res.data,
        selling_mode: res.data?.selling_mode || res.data?.pricing_type || pricingMode,
        pricing_type: res.data?.pricing_type || res.data?.selling_mode || pricingMode,
        price: res.data?.price ?? price,
        starting_bid: res.data?.starting_bid ?? startingBid,
        art_code: res.data?.art_code || artCode,
      };
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
    .input(
      z
        .object({
          artistId: z.string().optional().nullable(),
        })
        .optional()
        .nullable()
    )
    .query(async ({ ctx, input }) => {
      try {
        const artistId = input?.artistId;
        if (!artistId) {
          return [];
        }

        const supabase = await getAuthenticatedClient(ctx);
        const viewerId = ctx.session?.user?.id || (ctx as any).user?.id || null;

        const { data: artworks, error } = await supabase
          .from('artworks')
          .select('*')
          .eq('artist_id', artistId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('getArtistArtworks error caught gracefully:', error.message || error);
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

        // Fetch ratings & artist profile in parallel
        const [ratingsRes, profileRes] = await Promise.all([
          supabase
            .from('artwork_ratings')
            .select('artwork_id, user_id, rating')
            .in('artwork_id', artworkIds),
          supabase
            .from('profiles')
            .select('id, full_name, artist_name, avatar_url, role, title')
            .eq('id', artistId)
            .maybeSingle(),
        ]);

        const ratings = ratingsRes.data || [];
        const artistProf = profileRes.data || null;
        const artistName = artistProf?.artist_name?.trim() || artistProf?.full_name?.trim() || 'Verified Artist';

        return artworks.map((art: any, index: number) => {
          const artLikes = (likes || []).filter((l: any) => l.artwork_id === art.id);
          const artRatings = (ratings || []).filter((r: any) => r.artwork_id === art.id);

          const isLiked = viewerId ? artLikes.some((l: any) => l.user_id === viewerId) : false;
          const userRatingRow = viewerId ? artRatings.find((r: any) => r.user_id === viewerId) : null;
          const userRating = userRatingRow ? Number(userRatingRow.rating) : null;

          const ratingsSum = artRatings.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
          const avgRating = artRatings.length > 0 ? Math.round((ratingsSum / artRatings.length) * 10) / 10 : 0;
          const rawCode = art.art_code;
          const artCode = rawCode ? (rawCode.startsWith('#') ? rawCode : `#${rawCode}`) : `#ART-${101 + index}`;

          const rawPriceNum = Number(art.price ?? (art as any).amount ?? 0);
          const rawBidNum = Number(art.starting_bid ?? (art as any).startingBid ?? 0);
          const pt = String(art.pricing_type || '').toUpperCase().trim();
          const st = String((art as any).selling_type || art.selling_mode || '').toUpperCase().trim();

          let pricingType = 'NOT_FOR_SALE';
          if (rawPriceNum > 0 || ((art as any).amount !== undefined && Number((art as any).amount) > 0) || pt === 'FIXED_PRICE' || st === 'FIXED_PRICE') {
            pricingType = 'FIXED_PRICE';
          } else if (rawBidNum > 0 || pt === 'BIDDING' || st === 'BIDDING') {
            pricingType = 'BIDDING';
          }

          const price = rawPriceNum > 0 ? rawPriceNum : (art.price !== undefined && art.price !== null ? Number(art.price) : null);
          const startingBid = rawBidNum > 0 ? rawBidNum : (art.starting_bid !== undefined && art.starting_bid !== null ? Number(art.starting_bid) : null);

          return {
            id: art.id,
            artist_id: art.artist_id,
            title: art.title,
            description: art.description || null,
            image_url: art.image_url,
            created_at: art.created_at,
            likesCount: artLikes.length,
            isLiked,
            ratingsCount: artRatings.length,
            averageRating: avgRating,
            userRating,
            selling_mode: pricingType,
            pricing_type: pricingType,
            price,
            starting_bid: startingBid,
            art_code: artCode,
            profiles: artistProf ? {
              full_name: artistProf.full_name || null,
              artist_name: artistProf.artist_name || null,
              avatar_url: artistProf.avatar_url || null,
              role: artistProf.role || 'artist',
            } : null,
            artist: {
              id: artistId,
              name: artistName,
              avatar_url: artistProf?.avatar_url || null,
              title: artistProf?.title || 'Verified Artist',
              role: artistProf?.role || 'artist',
            },
          };
        });
      } catch (err) {
        console.warn('getArtistArtworks exception caught gracefully:', err);
        return [];
      }
    }),

  getAllArtworks: publicProcedure
    .input(
      z
        .object({
          sort: z.enum(['popular', 'highest_rated', 'most_liked', 'newest', 'price_low', 'price_high', 'bid_low', 'bid_high']).optional(),
          search: z.string().optional(),
          mode: z.enum(['ALL', 'GALLERY', 'BIDDING']).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const supabase = await getAuthenticatedClient(ctx);
        const viewerId = ctx.session?.user?.id || (ctx as any).user?.id || null;

        // 1. Fetch all artworks
        let { data: artworks, error } = await supabase
          .from('artworks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error || !artworks || artworks.length === 0) {
          // Fallback to Artwork table if artworks is empty
          try {
            const fallback = await supabase
              .from('Artwork')
              .select('*')
              .order('createdAt', { ascending: false });
            if (fallback.data && fallback.data.length > 0) {
              artworks = fallback.data.map((a: any) => ({
                id: a.id,
                artist_id: a.artistId,
                title: a.title,
                image_url: a.imageUrl,
                created_at: a.createdAt,
                selling_mode: a.selling_mode || a.sellingMode || 'NOT_FOR_SALE',
                price: a.price ?? null,
                starting_bid: a.starting_bid ?? a.startingBid ?? null,
                art_code: a.art_code ?? a.artCode ?? null,
              }));
            }
          } catch {}
        }

        if (!artworks || artworks.length === 0) {
          return [];
        }

        const artworkIds = artworks.map((a: any) => a.id);
        const artistIds = Array.from(new Set(artworks.map((a: any) => a.artist_id).filter(Boolean)));

        // 2. Fetch likes, ratings, and real artist profiles in parallel
        const [likesRes, ratingsRes, profilesRes] = await Promise.all([
          supabase.from('artwork_likes').select('artwork_id, user_id').in('artwork_id', artworkIds),
          supabase.from('artwork_ratings').select('artwork_id, user_id, rating').in('artwork_id', artworkIds),
          artistIds.length > 0
            ? supabase.from('profiles').select('id, first_name, last_name, full_name, artist_name, avatar_url, role, title, location, bio, phone, whatsapp_number, email').in('id', artistIds)
            : Promise.resolve({ data: [] }),
        ]);

        const likes = likesRes.data || [];
        const ratings = ratingsRes.data || [];
        const profiles = profilesRes.data || [];

        const profilesMap = new Map<string, any>();
        profiles.forEach((p: any) => {
          profilesMap.set(p.id, p);
        });

        let list = artworks.map((art: any, index: number) => {
          const artLikes = likes.filter((l: any) => l.artwork_id === art.id);
          const artRatings = ratings.filter((r: any) => r.artwork_id === art.id);
          const isLiked = viewerId ? artLikes.some((l: any) => l.user_id === viewerId) : false;
          const userRatingRow = viewerId ? artRatings.find((r: any) => r.user_id === viewerId) : null;
          const userRating = userRatingRow ? Number(userRatingRow.rating) : null;

          const ratingsSum = artRatings.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
          const avgRating = artRatings.length > 0 ? Math.round((ratingsSum / artRatings.length) * 10) / 10 : 0;
          const likesCount = artLikes.length;
          const ratingsCount = artRatings.length;

          // Smart Ranking score:
          const popularityScore =
            likesCount * 3 +
            avgRating * Math.log2(ratingsCount + 2) * 4 +
            (avgRating > 0 ? avgRating * 2 : 0);

          // Real Artist Profile Details
          const artistProfile = profilesMap.get(art.artist_id);
          const artistNameField = (artistProfile?.artist_name || '').trim();
          const profileFullName = (artistProfile?.full_name || '').trim();
          const combinedFirstLast = [artistProfile?.first_name, artistProfile?.last_name].filter(Boolean).join(' ').trim();
          const emailPrefix = artistProfile?.email ? artistProfile.email.split('@')[0] : '';
          const artistName = artistNameField || profileFullName || combinedFirstLast || emailPrefix || 'Verified Artist';

          // Formatted Artwork ID (e.g. #ART-104)
          const rawArtCode = art.art_code;
          let artCode = '';
          if (rawArtCode && typeof rawArtCode === 'string') {
            artCode = rawArtCode.startsWith('#') ? rawArtCode : `#${rawArtCode}`;
          } else {
            const hash = Math.abs(art.id.split('').reduce((acc: number, c: string) => (acc * 31 + c.charCodeAt(0)) | 0, 0)) % 900 + 100;
            artCode = `#ART-${hash}`;
          }

          const rawPriceNum = Number(art.price ?? (art as any).amount ?? 0);
          const rawBidNum = Number(art.starting_bid ?? (art as any).startingBid ?? 0);
          const pt = String(art.pricing_type || '').toUpperCase().trim();
          const st = String((art as any).selling_type || art.selling_mode || '').toUpperCase().trim();

          let sellingMode = 'NOT_FOR_SALE';
          if (rawPriceNum > 0 || ((art as any).amount !== undefined && Number((art as any).amount) > 0) || pt === 'FIXED_PRICE' || st === 'FIXED_PRICE') {
            sellingMode = 'FIXED_PRICE';
          } else if (rawBidNum > 0 || pt === 'BIDDING' || st === 'BIDDING') {
            sellingMode = 'BIDDING';
          }

          const price = rawPriceNum > 0 ? rawPriceNum : (art.price !== undefined && art.price !== null ? Number(art.price) : null);
          const startingBid = rawBidNum > 0 ? rawBidNum : (art.starting_bid !== undefined && art.starting_bid !== null ? Number(art.starting_bid) : null);

          return {
            id: art.id,
            artist_id: art.artist_id,
            title: art.title || 'Untitled Artwork',
            description: art.description || null,
            image_url: art.image_url,
            created_at: art.created_at,
            likesCount,
            ratingsCount,
            averageRating: avgRating,
            userRating,
            isLiked,
            popularityScore,
            selling_mode: sellingMode,
            pricing_type: sellingMode,
            price,
            starting_bid: startingBid,
            art_code: artCode,
            artist: {
              id: art.artist_id,
              name: artistName,
              avatar_url: artistProfile?.avatar_url || null,
              title: artistProfile?.title || 'Verified Artist',
              role: artistProfile?.role || 'artist',
              bio: artistProfile?.bio || null,
              location: artistProfile?.location || null,
              phone: artistProfile?.phone || null,
              whatsapp_number: artistProfile?.whatsapp_number || artistProfile?.phone || null,
            },
            profiles: artistProfile ? {
              full_name: profileFullName,
              artist_name: artistNameField || null,
              avatar_url: artistProfile?.avatar_url || null,
              role: artistProfile?.role || 'artist',
            } : null,
          };
        });

        // 3. Mode filtering (Gallery vs Bidding)
        if (input?.mode === 'GALLERY') {
          list = list.filter((item: any) => item.selling_mode !== 'BIDDING' && (item as any).pricing_type !== 'BIDDING');
        } else if (input?.mode === 'BIDDING') {
          list = list.filter((item: any) => item.selling_mode === 'BIDDING' || (item as any).pricing_type === 'BIDDING');
        }

        // 4. Search filtering
        if (input?.search?.trim()) {
          const s = input.search.trim().toLowerCase();
          list = list.filter(
            (item: any) =>
              item.title.toLowerCase().includes(s) ||
              item.artist.name.toLowerCase().includes(s) ||
              item.art_code.toLowerCase().includes(s)
          );
        }

        // 5. Sorting
        const sort = input?.sort || 'popular';
        if (sort === 'popular') {
          list.sort((a: any, b: any) => b.popularityScore - a.popularityScore || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sort === 'highest_rated') {
          list.sort((a: any, b: any) => b.averageRating - a.averageRating || b.ratingsCount - a.ratingsCount || b.likesCount - a.likesCount);
        } else if (sort === 'most_liked') {
          list.sort((a: any, b: any) => b.likesCount - a.likesCount || b.averageRating - a.averageRating);
        } else if (sort === 'newest') {
          list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sort === 'price_low') {
          list.sort((a: any, b: any) => (a.price ?? 0) - (b.price ?? 0));
        } else if (sort === 'price_high') {
          list.sort((a: any, b: any) => (b.price ?? 0) - (a.price ?? 0));
        } else if (sort === 'bid_low') {
          list.sort((a: any, b: any) => (a.starting_bid ?? 0) - (b.starting_bid ?? 0));
        } else if (sort === 'bid_high') {
          list.sort((a: any, b: any) => (b.starting_bid ?? 0) - (a.starting_bid ?? 0));
        }

        return list;
      } catch (err) {
        console.warn('getAllArtworks exception caught gracefully:', err);
        return [];
      }
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
    .input(
      z
        .object({
          artworkId: z.string().optional().nullable(),
        })
        .optional()
        .nullable()
    )
    .query(async ({ ctx, input }) => {
      try {
        const artworkId = input?.artworkId;
        if (!artworkId) {
          return [];
        }

        const supabase = await getAuthenticatedClient(ctx);

        const { data: comments, error } = await supabase
          .from('artwork_comments')
          .select('*')
          .eq('artwork_id', artworkId)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('getArtworkComments error caught gracefully:', error.message || error);
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
      } catch (err) {
        console.warn('getArtworkComments exception caught gracefully:', err);
        return [];
      }
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
    .input(
      z
        .object({
          artistId: z.string().optional().nullable(),
        })
        .optional()
        .nullable()
    )
    .query(async ({ ctx, input }) => {
      try {
        const artistId = input?.artistId;
        if (!artistId) {
          return [];
        }

        const supabase = await getAuthenticatedClient(ctx);

        // 1. Fetch from 'reviews' table matching artist_id
        let reviewsData: any[] = [];
        const { data: reviews, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('artist_id', artistId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(reviews) && reviews.length > 0) {
          reviewsData = reviews;
        } else {
          // Fallback check on artist_reviews if reviews was empty
          const { data: fallbackReviews } = await supabase
            .from('artist_reviews')
            .select('*')
            .eq('artist_id', artistId)
            .order('created_at', { ascending: false });
          if (Array.isArray(fallbackReviews)) {
            reviewsData = fallbackReviews;
          }
        }

        if (reviewsData.length === 0) {
          return [];
        }

        // Fetch client profile info
        const clientIds = Array.from(new Set(reviewsData.map((r: any) => r.client_id).filter(Boolean)));
        const profilesMap: Record<string, { name: string; avatarUrl: string | null }> = {};

        if (clientIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, avatar_url')
            .in('id', clientIds);

          if (profiles) {
            profiles.forEach((p: any) => {
              const fName = p.first_name || '';
              const lName = p.last_name || '';
              const name = p.full_name || `${fName} ${lName}`.trim() || 'Verified Client';
              profilesMap[p.id] = {
                name,
                avatarUrl: p.avatar_url || null,
              };
            });
          }
        }

        return reviewsData.map((r: any) => {
          const text = r.comment || r.review_text || '';
          return {
            id: r.id,
            artistId: r.artist_id,
            clientId: r.client_id,
            rating: Number(r.rating) || 5,
            comment: text,
            reviewText: text,
            createdAt: r.created_at,
            clientName: profilesMap[r.client_id]?.name || 'Verified Client',
            clientAvatar: profilesMap[r.client_id]?.avatarUrl || null,
          };
        });
      } catch (err) {
        console.warn('getArtistReviews exception caught gracefully:', err);
        return [];
      }
    }),

  addArtistReview: protectedProcedure
    .input(
      z.object({
        artistId: z.string(),
        rating: z.number().int().min(1, 'Rating must be at least 1 star').max(5, 'Rating cannot exceed 5 stars'),
        comment: z.string().trim().min(1, 'Comment is required').max(2000, 'Comment is too long').optional(),
        reviewText: z.string().trim().min(1, 'Review text is required').max(2000, 'Review text is too long').optional(),
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

      const commentContent = (input.comment || input.reviewText || '').trim();
      if (!commentContent) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Review comment is required',
        });
      }

      const supabase = await getAuthenticatedClient(ctx);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      // Insert { artist_id, client_id: user.id, rating, comment } into reviews table
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          id,
          artist_id: input.artistId,
          client_id: clientId,
          rating: input.rating,
          comment: commentContent,
          created_at: createdAt,
        })
        .select()
        .single();

      if (error) {
        console.warn('reviews insert error, attempting artist_reviews fallback:', error);
        // Fallback to artist_reviews table if needed
        const { data: fbData, error: fbError } = await supabase
          .from('artist_reviews')
          .insert({
            id,
            artist_id: input.artistId,
            client_id: clientId,
            rating: input.rating,
            review_text: commentContent,
            created_at: createdAt,
          })
          .select()
          .single();

        if (fbError) {
          console.error('addArtistReview fallback error:', fbError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || fbError.message || 'Failed to submit review',
          });
        }
      }

      // Fetch client profile info
      let clientName = ctx.session.user?.name || 'Verified Client';
      let clientAvatar: string | null = null;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, full_name, avatar_url')
          .eq('id', clientId)
          .maybeSingle();

        if (profile) {
          const fName = profile.first_name || '';
          const lName = profile.last_name || '';
          const name = profile.full_name || `${fName} ${lName}`.trim();
          if (name) clientName = name;
          clientAvatar = profile.avatar_url || null;
        }
      } catch {}

      return {
        id: data?.id || id,
        artistId: input.artistId,
        clientId,
        rating: input.rating,
        comment: commentContent,
        reviewText: commentContent,
        createdAt: data?.created_at || createdAt,
        clientName,
        clientAvatar,
      };
    }),
});
