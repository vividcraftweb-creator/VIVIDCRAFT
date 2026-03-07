import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

const FRAUD_FLAG_STATUSES = ['PENDING', 'DISMISSED', 'CONFIRMED', 'RESOLVED'] as const;
type FraudFlagStatus = (typeof FRAUD_FLAG_STATUSES)[number];

const isFraudFlagStatus = (value: string): value is FraudFlagStatus =>
  FRAUD_FLAG_STATUSES.includes(value as FraudFlagStatus);

// GET - Fetch all fraud flags
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('FraudFlag')
      .select(`
        *,
        user:User(
          id,
          email,
          role,
          trustScore,
          isSoftSuspended,
          createdAt,
          profile:Profile(
            firstName,
            lastName
          )
        )
      `)
      .order('severity', { ascending: false })
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (status !== 'ALL') {
      query = query.eq('status', status);
    }

    const { data: flags, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ flags });
  } catch (error) {
  }
}

// PATCH - Update flag status
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const body = await request.json();
    const { flagId, status, resolution } = body as {
      flagId?: string;
      status?: string;
      resolution?: string;
    };

    if (!flagId || !status) {
      return NextResponse.json(
        { error: 'flagId and status are required' },
        { status: 400 }
      );
    }

    if (!isFraudFlagStatus(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    const { data: updatedFlag, error } = await supabase
      .from('FraudFlag')
      .update({
        status,
        resolution,
        reviewedBy: session.user.id,
        reviewedAt: new Date().toISOString(),
      })
      .eq('id', flagId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      flag: updatedFlag,
    });
  } catch (error) {
  }
}
