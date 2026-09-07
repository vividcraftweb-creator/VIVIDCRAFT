'use client';

import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Briefcase, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import FreelancerRecommendationCard from '@/components/recommendations/FreelancerRecommendationCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function RecommendationsView() {
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Fetch user plan to determine recommendation limit
  const { data: planSummary } = trpc.user.getPlanFeatures.useQuery(undefined, { retry: false });
  const subscriptionPlan = planSummary?.plan;

  // Determine recommendation limit based on plan
  const recommendationLimit = useMemo(() => {
    if (subscriptionPlan === 'CLIENT_ENTERPRISE') return 10;
    return 5; // Business plan default
  }, [subscriptionPlan]);

  // Fetch open jobs
  const { data: jobs, isLoading: jobsLoading } = trpc.jobs.getJobsForClient.useQuery();

  // Filter only open jobs
  const openJobs = useMemo(() => {
    const safeJobs = Array.isArray(jobs) ? jobs : [];
    return safeJobs.filter((job) => job.status === 'OPEN');
  }, [jobs]);

  // Auto-select first job if available
  useEffect(() => {
    if (openJobs.length > 0 && !selectedJobId) {
      setSelectedJobId(openJobs[0].id);
    }
  }, [openJobs, selectedJobId]);

  const activeJobId = selectedJobId || openJobs[0]?.id || '';

  // Fetch recommendations for selected job
  const {
    data: recommendationsData,
    isLoading: recommendationsLoading,
    error: recommendationsError,
  } = trpc.recommendations.getForJob.useQuery(
    { jobId: activeJobId, limit: recommendationLimit },
    { enabled: !!activeJobId }
  );

  const recommendations = Array.isArray(recommendationsData?.recommendations)
    ? recommendationsData.recommendations
    : [];

  // Check if user has access to this feature
  const hasAccess = planSummary?.permissions?.hasAdvancedClientAnalytics;

  if (!hasAccess) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 text-center">
          <Sparkles className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Upgrade to Access AI Recommendations
          </h3>
          <p className="text-slate-400 mb-6">
            Get AI-powered freelancer recommendations matched to your job requirements.
            Available on Business and Enterprise plans.
          </p>
          <Button asChild>
            <Link href="/dashboard?tab=subscription">
              Upgrade Now
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-400" />
            AI Freelancer Recommendations
          </h2>
          <p className="text-slate-400 mt-1">
            AI-powered matches based on skills, budget, ratings, and past success
          </p>
        </div>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">
          {subscriptionPlan === 'CLIENT_ENTERPRISE' ? 'Top 10' : 'Top 5'} Matches
        </Badge>
      </div>

      {/* Job Selector */}
      {jobsLoading ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
            <span className="text-slate-400">Loading your jobs...</span>
          </CardContent>
        </Card>
      ) : openJobs.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 text-center">
            <Briefcase className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Open Jobs
            </h3>
            <p className="text-slate-400 mb-6">
              Post your first job to get AI-powered freelancer recommendations tailored to your needs.
            </p>
            <Button asChild>
              <Link href="/jobs/create">
                <Briefcase className="h-4 w-4 mr-2" />
                Post a Job
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Select a Job
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className="w-full bg-slate-900/50 border-white/10 text-white">
                  <SelectValue placeholder="Choose a job to see recommendations" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {openJobs.map((job) => (
                    <SelectItem
                      key={job.id}
                      value={job.id}
                      className="text-white hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{job.title}</span>
                        {job.budget && (
                          <span className="text-sm text-slate-400 ml-4">
                            ${job.budget.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Recommendations Grid */}
          {recommendationsLoading ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
                <span className="text-slate-400">Finding the best matches...</span>
              </CardContent>
            </Card>
          ) : recommendationsError ? (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                Failed to load recommendations. Please try again or contact support if the issue persists.
              </AlertDescription>
            </Alert>
          ) : recommendations.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Recommendations Available
                </h3>
                <p className="text-slate-400 mb-4">
                  We couldn't find strong matches for this job yet. Try:
                </p>
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>• Adding more relevant skills to your job posting</li>
                  <li>• Adjusting your budget range</li>
                  <li>• Broadening your requirements</li>
                </ul>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {recommendations.length} Recommended Freelancer{recommendations.length === 1 ? '' : 's'}
                </h3>
                <span className="text-sm text-slate-400">
                  Sorted by match score
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((recommendation) => (
                  <FreelancerRecommendationCard
                    key={recommendation.freelancerId}
                    recommendation={recommendation}
                    jobId={selectedJobId}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Info Card */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-300">
              <strong className="text-white">How AI Recommendations Work:</strong> We analyze
              freelancer skills, budget alignment, ratings, past success with you, and current
              availability to provide the best matches for your job.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
