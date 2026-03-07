import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth, ApiContext } from '@/middleware/api-auth';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/analytics/summary
 * Get analytics summary for the authenticated user
 */
export async function GET(req: NextRequest) {
  return withApiAuth(req, 'read:analytics', async (req: NextRequest, context: ApiContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const period = searchParams.get('period') || 'month'; // 'week', 'month', 'quarter', 'year'

      const supabase = await createClient();

      // Calculate date range
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'month':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Fetch jobs data
      const { data: jobs, count: totalJobs } = await supabase
        .from('Job')
        .select('*', { count: 'exact' })
        .eq('clientId', context.user.id)
        .gte('createdAt', startDate.toISOString());

      // Calculate metrics
      const openJobs = jobs?.filter(j => j.status === 'OPEN').length || 0;
      const closedJobs = jobs?.filter(j => j.status === 'CLOSED').length || 0;
      const totalBudget = jobs?.reduce((sum, job) => sum + (job.budget || 0), 0) || 0;

      // Get proposal count
      const { count: proposalCount } = await supabase
        .from('Proposal')
        .select('*', { count: 'exact', head: true })
        .in('jobId', jobs?.map(j => j.id) || []);

      return NextResponse.json({
        success: true,
        data: {
          period,
          dateRange: {
            start: startDate.toISOString(),
            end: now.toISOString()
          },
          metrics: {
            totalJobs: totalJobs || 0,
            openJobs,
            closedJobs,
            totalProposals: proposalCount || 0,
            totalBudget,
            avgBudgetPerJob: totalJobs && totalJobs > 0 ? totalBudget / totalJobs : 0,
            successRate: totalJobs && totalJobs > 0 ? (closedJobs / totalJobs) * 100 : 0
          }
        }
      });

    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch analytics summary'
      }, { status: 500 });
    }
  });
}
