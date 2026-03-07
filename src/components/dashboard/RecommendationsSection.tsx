'use client';

import { useMemo } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, TrendingUp, Briefcase } from 'lucide-react';
import FreelancerRecommendationCard from '@/components/recommendations/FreelancerRecommendationCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function RecommendationsSection() {
  // Fetch user plan
  const { data: planSummary } = trpc.user.getPlanFeatures.useQuery();
  const subscriptionPlan = planSummary?.plan;
  const hasAccess = planSummary?.permissions?.hasAdvancedClientAnalytics;

  // Determine recommendation limit (show 3-5 on dashboard)
  const dashboardLimit = useMemo(() => {
    if (subscriptionPlan === 'CLIENT_ENTERPRISE') return 5;
    return 3; // Business plan shows 3 on dashboard
  }, [subscriptionPlan]);

  // Fetch open jobs
  const { data: jobs, isLoading: jobsLoading } = trpc.jobs.getJobsForClient.useQuery();

  // Get most recent open job
  const mostRecentOpenJob = useMemo(() => {
    const openJobs = jobs?.filter((job) => job.status === 'OPEN') || [];
    if (openJobs.length === 0) return null;
    // Sort by createdAt descending
    return openJobs.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    })[0];
  }, [jobs]);

  // Fetch recommendations for most recent open job
  const {
    data: recommendationsData,
    isLoading: recommendationsLoading,
  } = trpc.recommendations.getForJob.useQuery(
    { jobId: mostRecentOpenJob?.id || '', limit: dashboardLimit },
    { enabled: !!mostRecentOpenJob?.id && hasAccess }
  );

  const recommendations = recommendationsData?.recommendations || [];

  // Don't show section if user doesn't have access
  if (!hasAccess) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">AI Recommendations</h2>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">
            Powered by AI
          </Badge>
        </div>
        {mostRecentOpenJob && recommendations.length > 0 && (
          <span className="text-sm text-slate-400">
            For: <span className="text-white font-medium">{mostRecentOpenJob.title}</span>
          </span>
        )}
      </div>

      {/* No Open Jobs State */}
      {!jobsLoading && !mostRecentOpenJob && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 text-center">
            <Briefcase className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Post a Job to Get AI Recommendations
            </h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Create your first job posting and we'll use AI to find the best-matched freelancers
              based on skills, budget, ratings, and availability.
            </p>
            <Button asChild>
              <Link href="/jobs/create">
                <Briefcase className="h-4 w-4 mr-2" />
                Post Your First Job
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {(jobsLoading || recommendationsLoading) && mostRecentOpenJob && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
            <span className="text-slate-400">Finding the best matches...</span>
          </CardContent>
        </Card>
      )}

      {/* No Recommendations State */}
      {!jobsLoading && !recommendationsLoading && mostRecentOpenJob && recommendations.length === 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No Matches Found Yet
            </h3>
            <p className="text-slate-400 text-sm">
              We're still looking for freelancers that match your requirements for "{mostRecentOpenJob.title}".
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recommendations Grid */}
      {!jobsLoading && !recommendationsLoading && recommendations.length > 0 && mostRecentOpenJob && (
        <>
          <p className="text-slate-400 text-sm">
            Top {recommendations.length} recommended freelancers based on skills, budget, ratings, and availability
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {recommendations.map((recommendation) => (
              <FreelancerRecommendationCard
                key={recommendation.freelancerId}
                recommendation={recommendation}
                jobId={mostRecentOpenJob.id}
              />
            ))}
          </div>
          {jobs && jobs.filter((j) => j.status === 'OPEN').length > 1 && (
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">
                You have {jobs.filter((j) => j.status === 'OPEN').length} open jobs.
                View recommendations for all jobs in your job listings.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
