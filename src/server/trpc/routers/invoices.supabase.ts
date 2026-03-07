/**
 * Invoices Router - Migrated to Supabase
 * Handles all invoice-related operations using Supabase database
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createClient } from '@/lib/supabase/server';

export const invoicesRouter = router({
  getInvoicesForClient: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== 'CLIENT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only clients can view invoices.',
      });
    }

    const supabase = await createClient();

    const { data: invoices, error } = await supabase
      .from('Invoice')
      .select(`
        *,
        contract:Contract!Invoice_contractId_fkey(
          *,
          job:Job!Contract_jobId_fkey(*),
          freelancer:User!Contract_freelancerId_fkey(
            *,
            Profile(*)
          )
        ),
        payment:Payment(*)
      `)
      .eq('clientId', ctx.session.user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch invoices',
      });
    }

    return invoices || [];
  }),

  getInvoiceById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const supabase = await createClient();

      const { data: invoice, error } = await supabase
        .from('Invoice')
        .select(`
          *,
          client:User!Invoice_clientId_fkey(
            *,
            Profile(*)
          ),
          contract:Contract!Invoice_contractId_fkey(
            *,
            job:Job!Contract_jobId_fkey(*),
            freelancer:User!Contract_freelancerId_fkey(
              *,
              Profile(*)
            )
          ),
          payment:Payment(*)
        `)
        .eq('id', input.id)
        .single();

      if (error || !invoice || invoice.clientId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return invoice;
    }),
});
