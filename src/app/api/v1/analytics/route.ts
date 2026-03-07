import { NextRequest, NextResponse } from 'next/server';
import { withApiKey, logSuccess } from '@/lib/api/middleware';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/analytics - Get analytics data
 * Required scope: read:analytics
 */
export async function GET(request: NextRequest) {
  const auth = await withApiKey(request, ['read:analytics']);

  if (!auth.success) {
    return auth.response;
  }

  try {
    const { searchParams } = request.nextUrl;
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 365);

    const supabase = await createClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get job statistics
    const { data: jobs } = await supabase
      .from('Job')
      .select('id, status, createdAt')
      .eq('clientId', auth.context.user.id)
      .gte('createdAt', startDate.toISOString());

    // Get proposal statistics
    const { data: proposals } = await supabase
      .from('Proposal')
      .select('id, status, createdAt, job:Job!inner(clientId)')
      .eq('job.clientId', auth.context.user.id)
      .gte('createdAt', startDate.toISOString());

    // Calculate metrics
    const analytics = {
      jobs: {
        total: jobs?.length || 0,
        active: jobs?.filter((j) => j.status === 'OPEN').length || 0,
        closed: jobs?.filter((j) => j.status === 'CLOSED').length || 0,
        draft: jobs?.filter((j) => j.status === 'DRAFT').length || 0,
      },
      proposals: {
        total: proposals?.length || 0,
        pending: proposals?.filter((p) => p.status === 'PENDING').length || 0,
        accepted: proposals?.filter((p) => p.status === 'ACCEPTED').length || 0,
        rejected: proposals?.filter((p) => p.status === 'REJECTED').length || 0,
      },
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
    };

    await logSuccess(auth.context, 200, request);

    return NextResponse.json({
      data: analytics,
    });
  } catch (error: unknown) {
    await logSuccess(auth.context, 500, request);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}
