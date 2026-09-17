/**
 * Admin Auctions Router
 * Handles live auction and bidding management for platform administrators
 */

import { router, adminProcedure } from '../../trpc';
import type { Context } from '../../context';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const getAdminSupabase = (ctx: Context) => {
  return createAdminClient() || ctx.adminSupabase;
};

export const adminAuctionsRouter = router({
  /**
   * Get all live and ended auctions
   */
  getAuctions: adminProcedure
    .input(
      z
        .object({
          status: z.enum(['ALL', 'LIVE', 'ACTIVE', 'ENDED']).optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const supabase = getAdminSupabase(ctx);
        if (!supabase) return [];

        // 1. Fetch artworks configured for BIDDING
        let query = supabase
          .from('artworks')
          .select('*, profiles(*)')
          .or('selling_mode.eq.BIDDING,pricing_type.eq.BIDDING')
          .order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) {
          console.warn('Error fetching artworks for bidding:', error);
        }

        let items: any[] = data || [];

        // 2. If table was empty or not found, try fallback
        if (items.length === 0) {
          try {
            const { data: rawArts } = await supabase
              .from('artworks')
              .select('*')
              .order('created_at', { ascending: false });
            if (rawArts) {
              items = rawArts.filter(
                (a: any) =>
                  a.selling_mode === 'BIDDING' ||
                  a.pricing_type === 'BIDDING' ||
                  (a.starting_bid !== null && a.starting_bid !== undefined && Number(a.starting_bid) > 0)
              );
            }
          } catch {}
        }

        // 3. Format into unified auction objects
        let formatted = items.map((art: any) => {
          const profile = Array.isArray(art.profiles) ? art.profiles[0] : art.profiles;
          const artistName =
            profile?.full_name ||
            profile?.display_name ||
            profile?.artist_name ||
            [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
            profile?.email ||
            'Vivid Art House';

          const rawCode = art.art_code;
          const artCode =
            rawCode && typeof rawCode === 'string'
              ? rawCode.startsWith('#')
                ? rawCode
                : `#${rawCode}`
              : `#AUC-${Math.abs(art.id.split('').reduce((acc: number, c: string) => (acc * 31 + c.charCodeAt(0)) | 0, 0)) % 900 + 100}`;

          const rawStart = Number(art.starting_bid ?? (art as any).startingBid ?? 0);
          const rawCurrent = Number(art.current_bid ?? (art as any).currentBid ?? rawStart);
          const rawStatus = (art.status || 'LIVE').toUpperCase();
          const effectiveStatus = rawStatus === 'ENDED' ? 'ENDED' : 'LIVE';

          return {
            id: art.id,
            title: art.title || 'Live Auction Item',
            description: art.description || '',
            image_url: art.image_url || '',
            starting_bid: rawStart,
            current_bid: rawCurrent >= rawStart ? rawCurrent : rawStart,
            end_time: art.end_time || null,
            status: effectiveStatus,
            created_at: art.created_at || new Date().toISOString(),
            art_code: artCode,
            artist_id: art.artist_id,
            artist_name: artistName,
            profiles: profile,
          };
        });

        // 4. Apply status filter
        if (input?.status && input.status !== 'ALL') {
          const targetStatus = input.status === 'ENDED' ? 'ENDED' : 'LIVE';
          formatted = formatted.filter((item) => item.status === targetStatus);
        }

        // 5. Apply search query
        if (input?.search?.trim()) {
          const q = input.search.toLowerCase().trim();
          formatted = formatted.filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.art_code.toLowerCase().includes(q) ||
              item.artist_name.toLowerCase().includes(q) ||
              (item.description && item.description.toLowerCase().includes(q))
          );
        }

        return formatted;
      } catch (err) {
        console.error('getAuctions exception:', err);
        return [];
      }
    }),

  /**
   * Create a new Live Auction
   */
  createAuction: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional(),
        imageUrl: z.string().min(1, 'Image URL is required'),
        startingBid: z.number().min(0, 'Starting bid must be non-negative'),
        currentBid: z.number().optional(),
        endTime: z.string().optional().nullable(),
        status: z.enum(['LIVE', 'ACTIVE', 'ENDED']).default('LIVE'),
        artCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = getAdminSupabase(ctx);
      if (!supabase) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Admin client unavailable' });
      }

      const auctionId = crypto.randomUUID();
      const randomCode =
        input.artCode ||
        `#AUC-${Math.floor(100 + Math.random() * 900)}`;

      const startingBid = Number(input.startingBid);
      const currentBid = input.currentBid !== undefined ? Number(input.currentBid) : startingBid;
      const status = input.status === 'ENDED' ? 'ENDED' : 'LIVE';
      const adminUserId = ctx.session?.user?.id || 'admin-vividcraft-default-id';

      // 1. Insert into public.artworks with bidding fields
      const artworkPayload: Record<string, any> = {
        id: auctionId,
        artist_id: adminUserId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        image_url: input.imageUrl.trim(),
        selling_mode: 'BIDDING',
        pricing_type: 'BIDDING',
        starting_bid: startingBid,
        current_bid: currentBid,
        price: null,
        art_code: randomCode,
        status: status,
        end_time: input.endTime || null,
        created_at: new Date().toISOString(),
      };

      let insertError: any = null;

      try {
        const { error } = await supabase.from('artworks').insert(artworkPayload);
        if (error) {
          insertError = error;
          // Graceful fallback if end_time or current_bid or status columns don't exist yet
          const fallbackPayload = {
            id: auctionId,
            artist_id: adminUserId,
            title: input.title.trim(),
            description: input.description?.trim() || null,
            image_url: input.imageUrl.trim(),
            selling_mode: 'BIDDING',
            pricing_type: 'BIDDING',
            starting_bid: startingBid,
            price: null,
            art_code: randomCode,
          };
          const retryRes = await supabase.from('artworks').insert(fallbackPayload);
          if (!retryRes.error) {
            insertError = null;
          }
        }
      } catch (err: any) {
        insertError = err;
      }

      if (insertError) {
        console.error('Failed to create auction artwork:', insertError);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: insertError?.message || 'Failed to create auction',
        });
      }

      // 2. Also try inserting into dedicated auctions table if present
      try {
        await supabase.from('auctions').insert({
          id: auctionId,
          artwork_id: auctionId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          image_url: input.imageUrl.trim(),
          starting_bid: startingBid,
          current_bid: currentBid,
          end_time: input.endTime || null,
          status: status,
        });
      } catch {}

      // 3. Audit log
      try {
        await supabase.from('AuditLog').insert({
          id: crypto.randomUUID(),
          action: 'CREATE_AUCTION',
          entityType: 'AUCTION',
          entityId: auctionId,
          userId: ctx.session?.user?.id || null,
          metadata: {
            title: input.title,
            startingBid,
            endTime: input.endTime,
          },
          createdAt: new Date().toISOString(),
        });
      } catch {}

      return {
        success: true,
        id: auctionId,
        artCode: randomCode,
      };
    }),

  /**
   * Update an existing auction (bids, end time, status)
   */
  updateAuction: adminProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        currentBid: z.number().optional(),
        startingBid: z.number().optional(),
        endTime: z.string().optional().nullable(),
        status: z.enum(['LIVE', 'ACTIVE', 'ENDED']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = getAdminSupabase(ctx);
      if (!supabase) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Admin client unavailable' });
      }

      const updates: Record<string, any> = {};
      if (input.title !== undefined) updates.title = input.title.trim();
      if (input.description !== undefined) updates.description = input.description.trim();
      if (input.startingBid !== undefined) updates.starting_bid = Number(input.startingBid);
      if (input.currentBid !== undefined) updates.current_bid = Number(input.currentBid);
      if (input.endTime !== undefined) updates.end_time = input.endTime;
      if (input.status !== undefined) {
        updates.status = input.status === 'ENDED' ? 'ENDED' : 'LIVE';
      }

      // Update in public.artworks
      try {
        const { error } = await supabase.from('artworks').update(updates).eq('id', input.id);
        if (error) {
          // If update failed due to missing column, strip optional columns and retry
          delete updates.end_time;
          delete updates.status;
          delete updates.current_bid;
          await supabase.from('artworks').update(updates).eq('id', input.id);
        }
      } catch (err) {
        console.warn('Update artworks notice:', err);
      }

      // Also update in public.auctions if exists
      try {
        await supabase
          .from('auctions')
          .update(updates)
          .or(`id.eq.${input.id},artwork_id.eq.${input.id}`);
      } catch {}

      // Audit log
      try {
        await supabase.from('AuditLog').insert({
          id: crypto.randomUUID(),
          action: 'UPDATE_AUCTION',
          entityType: 'AUCTION',
          entityId: input.id,
          userId: ctx.session?.user?.id || null,
          metadata: updates,
          createdAt: new Date().toISOString(),
        });
      } catch {}

      return { success: true };
    }),

  /**
   * Cleanly delete an auction
   */
  deleteAuction: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = getAdminSupabase(ctx);
      if (!supabase) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Admin client unavailable' });
      }

      // 1. Delete associated ratings and likes
      try {
        await Promise.allSettled([
          supabase.from('artwork_ratings').delete().eq('artwork_id', input.id),
          supabase.from('artwork_likes').delete().eq('artwork_id', input.id),
        ]);
      } catch {}

      // 2. Delete from auctions table
      try {
        await supabase
          .from('auctions')
          .delete()
          .or(`id.eq.${input.id},artwork_id.eq.${input.id}`);
      } catch {}

      // 3. Delete from artworks table
      const { error } = await supabase.from('artworks').delete().eq('id', input.id);
      if (error) {
        try {
          await supabase.from('Artwork').delete().eq('id', input.id);
        } catch {}
      }

      // 4. Audit log
      try {
        await supabase.from('AuditLog').insert({
          id: crypto.randomUUID(),
          action: 'DELETE_AUCTION',
          entityType: 'AUCTION',
          entityId: input.id,
          userId: ctx.session?.user?.id || null,
          createdAt: new Date().toISOString(),
        });
      } catch {}

      return { success: true };
    }),
});
