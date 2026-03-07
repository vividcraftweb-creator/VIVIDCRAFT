'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  TrendingUp,
  Briefcase,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Target,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AnalyticsView() {
  const [days, setDays] = useState(30);

  // Fetch user plan
  const { data: planSummary } = trpc.user.getPlanFeatures.useQuery();
  const hasAccess = planSummary?.permissions?.hasAdvancedClientAnalytics;
  const isEnterprise = planSummary?.plan === 'CLIENT_ENTERPRISE';

  // Fetch analytics data
  const {
    data: analytics,
    isLoading,
    error,
  } = trpc.clients.getDetailedAnalytics.useQuery(
    { days },
    { enabled: hasAccess }
  );

  // Check access
  if (!hasAccess) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Upgrade to Access Enhanced Analytics
          </h3>
          <p className="text-slate-400 mb-6">
            Get detailed insights into your hiring performance, budget utilization, and more.
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
            <BarChart3 className="h-6 w-6 text-purple-400" />
            Enhanced Analytics Dashboard
          </h2>
          <p className="text-slate-400 mt-1">
            Comprehensive insights into your hiring performance and metrics
          </p>
        </div>
        <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30">
          {isEnterprise ? 'Advanced' : 'Standard'} Analytics
        </Badge>
      </div>

      {/* Date Range Selector */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Time Period:</span>
            <div className="flex gap-2">
              {[7, 30, 90, 180, 365].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={days === d ? 'default' : 'outline'}
                  onClick={() => setDays(d)}
                  className={
                    days === d
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-white/5 hover:bg-white/10 border-white/10'
                  }
                >
                  {d} days
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400 mr-3" />
            <span className="text-slate-400">Loading analytics...</span>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Alert className="bg-red-500/10 border-red-500/30">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            Failed to load analytics. Please try again or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      )}

      {/* Analytics Content */}
      {!isLoading && !error && analytics && (
        <>
          {/* Job Performance Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-400" />
              Job Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-200">Total Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{analytics.jobMetrics.totalJobs}</div>
                  <p className="text-xs text-blue-300 mt-1">
                    {analytics.jobMetrics.openJobs} open • {analytics.jobMetrics.closedJobs} closed
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-200">
                    Avg Proposals per Job
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {analytics.jobMetrics.avgProposalsPerJob}
                  </div>
                  <p className="text-xs text-emerald-300 mt-1">Per job posting</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-purple-200">
                    Acceptance Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {analytics.proposalMetrics.acceptanceRate}%
                  </div>
                  <p className="text-xs text-purple-300 mt-1">
                    {analytics.proposalMetrics.acceptedProposals}/{analytics.proposalMetrics.totalProposals} proposals
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-200">
                    Response Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {analytics.proposalMetrics.responseRate}%
                  </div>
                  <p className="text-xs text-amber-300 mt-1">Proposals reviewed</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Hiring Funnel */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-green-400" />
              Hiring Funnel
            </h3>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-300">Proposals Received</span>
                      <span className="text-white font-semibold">
                        {analytics.hiringFunnel.proposals}
                      </span>
                    </div>
                    <Progress value={100} className="h-3" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-300">Proposals Accepted</span>
                      <span className="text-white font-semibold">
                        {analytics.hiringFunnel.accepted}
                      </span>
                    </div>
                    <Progress
                      value={
                        analytics.hiringFunnel.proposals > 0
                          ? (analytics.hiringFunnel.accepted / analytics.hiringFunnel.proposals) * 100
                          : 0
                      }
                      className="h-3"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-300">Successful Hires</span>
                      <span className="text-green-400 font-semibold">
                        {analytics.hiringFunnel.hires}
                      </span>
                    </div>
                    <Progress
                      value={
                        analytics.hiringFunnel.proposals > 0
                          ? (analytics.hiringFunnel.hires / analytics.hiringFunnel.proposals) * 100
                          : 0
                      }
                      className="h-3 bg-green-500/20"
                    />
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Conversion Rate</span>
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                        {analytics.hiringFunnel.conversionRate}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget & Time Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Budget Analysis */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-yellow-400" />
                Budget Analysis
              </h3>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Avg Job Budget</span>
                    <span className="text-2xl font-bold text-white">
                      ${analytics.budgetAnalysis.avgJobBudget.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Avg Proposal Rate</span>
                    <span className="text-2xl font-bold text-white">
                      ${analytics.budgetAnalysis.avgProposalRate.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Budget Utilization</span>
                      <Badge
                        className={
                          analytics.budgetAnalysis.budgetUtilizationRate <= 100
                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                        }
                      >
                        {analytics.budgetAnalysis.budgetUtilizationRate}%
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {analytics.budgetAnalysis.budgetUtilizationRate <= 100
                        ? 'Proposals are within your budget range'
                        : 'Proposals exceed average job budget'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Time Metrics */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-cyan-400" />
                Time Metrics
              </h3>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-slate-400 text-sm mb-2">Avg Time to First Proposal</p>
                    <p className="text-4xl font-bold text-white mb-1">
                      {analytics.timeMetrics.avgTimeToFirstProposal}
                    </p>
                    <p className="text-slate-400 text-sm">hours</p>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-slate-500">
                        {analytics.timeMetrics.avgTimeToFirstProposal < 24
                          ? 'Excellent response time! Your jobs are attracting quick attention.'
                          : analytics.timeMetrics.avgTimeToFirstProposal < 72
                            ? 'Good response time. Consider optimizing job titles for faster responses.'
                            : 'Response time could be improved. Try enhancing job descriptions.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Top Skills */}
          {analytics.topSkills.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-indigo-400" />
                Top Skills in Demand
              </h3>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {analytics.topSkills.map((skill, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-300 capitalize">{skill.skill}</span>
                          <span className="text-slate-400">{skill.count} jobs</span>
                        </div>
                        <Progress
                          value={(skill.count / analytics.topSkills[0].count) * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Proposal Status Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-pink-400" />
              Proposal Status Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-200 mb-1">Accepted</p>
                    <p className="text-3xl font-bold text-white">
                      {analytics.proposalMetrics.acceptedProposals}
                    </p>
                  </div>
                  <CheckCircle2 className="h-12 w-12 text-green-400/50" />
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-200 mb-1">Rejected</p>
                    <p className="text-3xl font-bold text-white">
                      {analytics.proposalMetrics.rejectedProposals}
                    </p>
                  </div>
                  <XCircle className="h-12 w-12 text-red-400/50" />
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-200 mb-1">Pending</p>
                    <p className="text-3xl font-bold text-white">
                      {analytics.proposalMetrics.pendingProposals}
                    </p>
                  </div>
                  <Clock className="h-12 w-12 text-amber-400/50" />
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
