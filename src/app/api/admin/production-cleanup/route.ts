/**
 * Production Database Cleanup API Endpoint
 *
 * This endpoint prepares the database for production by:
 * 1. Preserving only the admin user (defined by ADMIN_EMAIL env var)
 * 2. Removing all other users and their associated data
 * 3. Removing all job postings and related data
 * 4. Clearing all test data
 *
 * SECURITY: Requires admin authentication and special confirmation header
 * DANGER: This endpoint will permanently delete data. Use with extreme caution.
 *
 * Usage:
 * POST /api/admin/production-cleanup
 * Headers:
 *   x-admin-secret: <your-admin-secret>
 *   x-confirm-cleanup: yes-delete-all-data
 *
 * Required environment variables:
 *   ADMIN_EMAIL  - The email of the admin user to preserve
 *   ADMIN_SECRET - A strong secret (32+ chars) to authenticate requests
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!ADMIN_EMAIL || !ADMIN_SECRET) {
  throw new Error(
    'Missing required environment variables: ADMIN_EMAIL and ADMIN_SECRET must be set to use the production cleanup endpoint.'
  );
}

export async function POST(request: Request) {
  try {
    // Security check 1: Admin secret
    const adminSecret = request.headers.get('x-admin-secret');
    if (adminSecret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Security check 2: Confirmation header
    const confirmation = request.headers.get('x-confirm-cleanup');
    if (confirmation !== 'yes-delete-all-data') {
      return NextResponse.json(
        { error: 'Missing or invalid confirmation header' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Step 1: Get the admin user ID
    const { data: adminUser, error: adminError } = await supabase
      .from('User')
      .select('id, email')
      .eq('email', ADMIN_EMAIL)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json(
        { error: `Admin user ${ADMIN_EMAIL} not found. Please create it before running cleanup.` },
        { status: 404 }
      );
    }

    const adminUserId = adminUser.id;
    const results = {
      preservedUser: ADMIN_EMAIL,
      preservedUserId: adminUserId,
      deletedCounts: {} as Record<string, number>,
    };

    // Helper function to delete and track count
    async function deleteAndTrack(table: string, condition: { column: string; value: string; operator: 'neq' | 'eq' }) {
      const query = supabase.from(table).delete();

      if (condition.operator === 'neq') {
        query.neq(condition.column, condition.value);
      } else {
        query.eq(condition.column, condition.value);
      }

      const { data, error } = await query.select();

      if (error) {
        throw new Error(`Failed to delete from ${table}: ${error.message}`);
      }

      results.deletedCounts[table] = data?.length || 0;
    }

    // Delete all data except admin user's data
    // Order is important to respect foreign key constraints

    // Delete job-related data first
    await deleteAndTrack('ProfileView', { column: 'id', value: '00000000-0000-0000-0000-000000000000', operator: 'neq' });
    await deleteAndTrack('Milestone', { column: 'id', value: '00000000-0000-0000-0000-000000000000', operator: 'neq' });
    await deleteAndTrack('Invoice', { column: 'id', value: '00000000-0000-0000-0000-000000000000', operator: 'neq' });
    await deleteAndTrack('Payment', { column: 'id', value: '00000000-0000-0000-0000-000000000000', operator: 'neq' });
    await deleteAndTrack('PayPalPayment', { column: 'id', value: '00000000-0000-0000-0000-000000000000', operator: 'neq' });
    await deleteAndTrack('Contract', { column: 'id', value: '00000000-0000-0000-0000-000000000000', operator: 'neq' });
    await deleteAndTrack('Proposal', { column: 'id', value: '00000000-0000-0000-0000-000000000000', operator: 'neq' });
    await deleteAndTrack('Job', { column: 'id', value: '00000000-0000-0000-0000-000000000000', operator: 'neq' });

    // Delete messaging data
    await deleteAndTrack('Message', { column: 'id', value: '00000000-0000-0000-0000-000000000000', operator: 'neq' });

    // Delete user-specific data (except admin)
    await deleteAndTrack('Notification', { column: 'userId', value: adminUserId, operator: 'neq' });
    await deleteAndTrack('Subscription', { column: 'userId', value: adminUserId, operator: 'neq' });
    await deleteAndTrack('FraudFlag', { column: 'id', value: '00000000-0000-0000-0000-000000000000', operator: 'neq' });
    await deleteAndTrack('Verification', { column: 'userId', value: adminUserId, operator: 'neq' });
    await deleteAndTrack('Document', { column: 'userId', value: adminUserId, operator: 'neq' });
    await deleteAndTrack('TicketResponse', { column: 'id', value: '00000000-0000-0000-0000-000000000000', operator: 'neq' });
    await deleteAndTrack('SupportTicket', { column: 'userId', value: adminUserId, operator: 'neq' });
    await deleteAndTrack('EmailVerificationToken', { column: 'userId', value: adminUserId, operator: 'neq' });
    await deleteAndTrack('TokenLog', { column: 'userId', value: adminUserId, operator: 'neq' });

    // Delete profile data (except admin)
    await deleteAndTrack('Certification', { column: 'userId', value: adminUserId, operator: 'neq' });
    await deleteAndTrack('EducationItem', { column: 'userId', value: adminUserId, operator: 'neq' });
    await deleteAndTrack('ExperienceItem', { column: 'userId', value: adminUserId, operator: 'neq' });
    await deleteAndTrack('PortfolioItem', { column: 'userId', value: adminUserId, operator: 'neq' });
    await deleteAndTrack('Profile', { column: 'userId', value: adminUserId, operator: 'neq' });

    // Finally, delete all users except admin
    await deleteAndTrack('User', { column: 'id', value: adminUserId, operator: 'neq' });

    return NextResponse.json({
      success: true,
      message: 'Database cleanup completed successfully',
      results,
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Production cleanup endpoint',
      usage: 'POST with headers: x-admin-secret and x-confirm-cleanup: yes-delete-all-data',
      warning: 'This will permanently delete all data except the admin user',
    },
    { status: 200 }
  );
}
