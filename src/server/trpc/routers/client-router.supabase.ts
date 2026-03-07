/**
 * Client Router - Migrated to Supabase
 * Handles client dashboard statistics using Supabase database
 */

import { router, protectedProcedure } from '../trpc';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const clientRouter = router({
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const supabase = await createClient();

    // Get counts in parallel
    const [
      { count: totalJobCount },
      { count: openJobCount },
      { data: proposals },
      { data: trackedProposals },
    ] = await Promise.all([
      supabase
        .from('Job')
        .select('*', { count: 'exact', head: true })
        .eq('clientId', userId),
      supabase
        .from('Job')
        .select('*', { count: 'exact', head: true })
        .eq('clientId', userId)
        .eq('status', 'OPEN'),
      supabase
        .from('Proposal')
        .select(`
          id,
          status,
          jobId,
          job:Job!Proposal_jobId_fkey(clientId)
        `)
        .eq('job.clientId', userId),
      supabase
        .from('ProposalTracking')
        .select('status')
        .eq('clientId', userId)
        .order('updatedAt', { ascending: false }),
    ]);

    const proposalsForClient = (proposals || []).filter((proposal) => {
      const jobEntry = Array.isArray(proposal?.job) ? proposal.job[0] : proposal?.job;
      return jobEntry?.clientId === userId;
    });
    const proposalsReceivedCount = proposalsForClient.length;
    const pendingProposalsCount = proposalsForClient.filter((proposal) => proposal.status === 'PENDING').length;
    const interviewsInProgressCount = (trackedProposals || []).filter((record) => {
      const status = record?.status;
      return status === 'interview_scheduled' || status === 'interview_completed';
    }).length;

    return {
      totalJobsCount: totalJobCount || 0,
      openJobCount: openJobCount || 0,
      proposalsReceivedCount,
      pendingProposalsCount,
      interviewsInProgressCount,
    };
  }),

  getDetailedAnalytics: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const supabase = await createClient();

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Get jobs within date range
      const { data: jobs } = await supabase
        .from('Job')
        .select('*')
        .eq('clientId', userId)
        .gte('createdAt', startDate.toISOString());

      const jobIds = (jobs || []).map((job) => job.id);

      // Get proposals for these jobs
      const { data: proposals } = await supabase
        .from('Proposal')
        .select(`
          id,
          status,
          proposedRate,
          createdAt,
          jobId,
          job:Job!Proposal_jobId_fkey(id, budget, clientId)
        `)
        .in('jobId', jobIds.length > 0 ? jobIds : ['']);

      // Filter proposals belonging to this client
      const clientProposals = (proposals || []).filter((proposal) => {
        const jobEntry = Array.isArray(proposal?.job) ? proposal.job[0] : proposal?.job;
        return jobEntry?.clientId === userId;
      });

      // Get contracts for hiring analytics
      const { data: contracts } = await supabase
        .from('Contract')
        .select('id, status, createdAt, freelancerId')
        .eq('clientId', userId)
        .gte('createdAt', startDate.toISOString());

      // Calculate metrics
      const totalJobs = jobs?.length || 0;
      const openJobs = jobs?.filter((j) => j.status === 'OPEN').length || 0;
      const closedJobs = jobs?.filter((j) => j.status === 'CLOSED').length || 0;

      const totalProposals = clientProposals.length;
      const acceptedProposals = clientProposals.filter((p) => p.status === 'ACCEPTED').length;
      const rejectedProposals = clientProposals.filter((p) => p.status === 'REJECTED').length;
      const pendingProposals = clientProposals.filter((p) => p.status === 'PENDING').length;

      const avgProposalsPerJob = totalJobs > 0 ? Math.round((totalProposals / totalJobs) * 10) / 10 : 0;
      const acceptanceRate = totalProposals > 0 ? Math.round((acceptedProposals / totalProposals) * 100) : 0;
      const responseRate = totalProposals > 0 ? Math.round(((acceptedProposals + rejectedProposals) / totalProposals) * 100) : 0;

      // Hiring funnel
      const hires = contracts?.filter((c) => c.status === 'ACTIVE' || c.status === 'COMPLETED').length || 0;
      const conversionRate = acceptedProposals > 0 ? Math.round((hires / acceptedProposals) * 100) : 0;

      // Budget analysis
      const jobsWithBudget = jobs?.filter((j) => j.budget && j.budget > 0) || [];
      const totalBudget = jobsWithBudget.reduce((sum, j) => sum + (j.budget || 0), 0);
      const avgJobBudget = jobsWithBudget.length > 0 ? Math.round(totalBudget / jobsWithBudget.length) : 0;

      const proposalsWithRate = clientProposals.filter((p) => p.proposedRate && p.proposedRate > 0);
      const avgProposalRate = proposalsWithRate.length > 0
        ? Math.round(proposalsWithRate.reduce((sum, p) => sum + (p.proposedRate || 0), 0) / proposalsWithRate.length)
        : 0;

      // Time to first proposal (average)
      let avgTimeToFirstProposal = 0;
      if (jobs && jobs.length > 0) {
        const jobsWithProposals = jobs.filter((job) => {
          return clientProposals.some((p) => p.jobId === job.id);
        });

        const timesToFirstProposal = jobsWithProposals.map((job) => {
          const jobProposals = clientProposals
            .filter((p) => p.jobId === job.id)
            .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

          if (jobProposals.length > 0) {
            const jobCreated = new Date(job.createdAt || 0).getTime();
            const firstProposal = new Date(jobProposals[0].createdAt || 0).getTime();
            return (firstProposal - jobCreated) / (1000 * 60 * 60); // hours
          }
          return 0;
        }).filter((time) => time > 0);

        avgTimeToFirstProposal = timesToFirstProposal.length > 0
          ? Math.round(timesToFirstProposal.reduce((sum, time) => sum + time, 0) / timesToFirstProposal.length)
          : 0;
      }

      // Skill demand analysis (top 5 skills from job tags)
      const allTags: string[] = [];
      jobs?.forEach((job) => {
        if (job.tags) {
          const tags = job.tags.split(/[,\s]+/).filter((t: string) => t.length > 0);
          allTags.push(...tags);
        }
      });

      const skillCounts: Record<string, number> = {};
      allTags.forEach((tag) => {
        const normalized = tag.toLowerCase().trim();
        skillCounts[normalized] = (skillCounts[normalized] || 0) + 1;
      });

      const topSkills = Object.entries(skillCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([skill, count]) => ({ skill, count }));

      return {
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: input.days,
        },
        jobMetrics: {
          totalJobs,
          openJobs,
          closedJobs,
          avgProposalsPerJob,
        },
        proposalMetrics: {
          totalProposals,
          acceptedProposals,
          rejectedProposals,
          pendingProposals,
          acceptanceRate,
          responseRate,
        },
        hiringFunnel: {
          proposals: totalProposals,
          accepted: acceptedProposals,
          hires,
          conversionRate,
        },
        budgetAnalysis: {
          avgJobBudget,
          avgProposalRate,
          budgetUtilizationRate: avgJobBudget > 0 ? Math.round((avgProposalRate / avgJobBudget) * 100) : 0,
        },
        timeMetrics: {
          avgTimeToFirstProposal, // in hours
        },
        topSkills,
      };
    }),
});
