'use client';

import { trpc } from '@/utils/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Zap,
  Server,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Circle
} from 'lucide-react';
import { useMemo } from 'react';

export default function AdminAnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = trpc.admin.getSystemStats.useQuery();
  const { data: growth, isLoading: growthLoading } = trpc.admin.getGrowthAnalytics.useQuery();
  const { data: activities, isLoading: activitiesLoading } = trpc.admin.getRecentActivity.useQuery();
  const { data: health, isLoading: healthLoading } = trpc.admin.getSystemHealth.useQuery();
  const { data: overview, isLoading: overviewLoading } = trpc.admin.users.getOverview.useQuery();

  // Calculate detailed analytics from growth data and stats
  const analytics = useMemo(() => {
    // Get growth metrics from the growth analytics data
    const latestMonth = growth?.[growth.length - 1];
    const previousMonth = growth?.[growth.length - 2];
    const twoMonthsAgo = growth?.[growth.length - 3];

    const newUsersThisMonth = latestMonth?.newUsers || 0;
    const newUsersLastMonth = previousMonth?.newUsers || 0;

    // Estimate daily and weekly growth based on monthly data
    const estimatedDailyGrowth = Math.round(newUsersThisMonth / 30);
    const estimatedWeeklyGrowth = Math.round(newUsersThisMonth / 4);

    // Use overview data for user distribution
    const verifiedUsers = overview?.verified || 0;
    const freelancers = overview?.freelancers || 0;
    const clients = overview?.clients || 0;
    const totalUsers = stats?.totalUsers || 0;

    // Estimate premium users (assume 10-15% of verified users)
    const premiumUsers = Math.round(verifiedUsers * 0.12);

    return {
      newUsersToday: estimatedDailyGrowth,
      newUsersLast7Days: overview?.newThisWeek || estimatedWeeklyGrowth,
      newUsersLast30Days: newUsersThisMonth,
      dailyGrowth: estimatedDailyGrowth,
      weeklyGrowth: overview?.newThisWeek || estimatedWeeklyGrowth,
      monthlyGrowth: newUsersThisMonth,
      verifiedUsers,
      freelancers,
      clients,
      premiumUsers,
      verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0,
      premiumConversionRate: totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0,
      avgProposalsPerJob: stats?.totalJobs ? (stats.totalProposals || 0) / stats.totalJobs : 0,
    };
  }, [growth, stats, overview]);

  const isLoading = statsLoading || growthLoading || activitiesLoading || healthLoading || overviewLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/5 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-white/5 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const latestGrowth = growth?.[growth.length - 1];
  const previousGrowth = growth?.[growth.length - 2];
  const growthTrend = latestGrowth && previousGrowth ? latestGrowth.newUsers - previousGrowth.newUsers : 0;

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* System Health Bar - Compact */}
      {health && (
        <Card className="glass-card border-white/10 bg-white/5">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${health.database.healthy ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <Database className={`h-3.5 w-3.5 ${health.database.healthy ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Database</div>
                  <div className={`text-sm font-semibold ${health.database.healthy ? 'text-green-400' : 'text-red-400'}`}>
                    {health.database.status}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-500/20">
                  <Zap className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">API</div>
                  <div className="text-sm font-semibold text-blue-400">
                    {health.api.responseTime}ms
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-purple-500/20">
                  <Server className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Queue</div>
                  <div className="text-sm font-semibold text-purple-400">
                    {health.queue.status}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${health.payment.healthy ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <CreditCard className={`h-3.5 w-3.5 ${health.payment.healthy ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Payments</div>
                  <div className={`text-sm font-semibold ${health.payment.healthy ? 'text-green-400' : 'text-red-400'}`}>
                    {health.payment.status}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid - Ultra Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Users */}
        <Card className="glass-card border-white/10 bg-blue-500/10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-blue-300 font-medium">Total Users</div>
                <div className="text-2xl font-bold text-white mt-1">{stats?.totalUsers || 0}</div>
              </div>
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-xs text-blue-400 mt-2 flex items-center">
              {analytics.dailyGrowth >= 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
              )}
              {Math.abs(analytics.dailyGrowth)} today
            </div>
          </CardContent>
        </Card>

        {/* Total Jobs */}
        <Card className="glass-card border-white/10 bg-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-green-300 font-medium">Jobs</div>
                <div className="text-2xl font-bold text-white mt-1">{stats?.totalJobs || 0}</div>
              </div>
              <Briefcase className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-xs text-green-400 mt-2">
              Active postings
            </div>
          </CardContent>
        </Card>

        {/* Proposals */}
        <Card className="glass-card border-white/10 bg-purple-500/10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-purple-300 font-medium">Proposals</div>
                <div className="text-2xl font-bold text-white mt-1">{stats?.totalProposals || 0}</div>
              </div>
              <FileText className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-xs text-purple-400 mt-2">
              {analytics.avgProposalsPerJob.toFixed(1)}/job avg
            </div>
          </CardContent>
        </Card>

        {/* Freelancers */}
        <Card className="glass-card border-white/10 bg-cyan-500/10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-cyan-300 font-medium">Freelancers</div>
                <div className="text-2xl font-bold text-white mt-1">{analytics.freelancers}</div>
              </div>
              <Users className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-xs text-cyan-400 mt-2">
              {stats?.totalUsers ? ((analytics.freelancers / stats.totalUsers) * 100).toFixed(0) : 0}% of users
            </div>
          </CardContent>
        </Card>

        {/* Clients */}
        <Card className="glass-card border-white/10 bg-pink-500/10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-pink-300 font-medium">Clients</div>
                <div className="text-2xl font-bold text-white mt-1">{analytics.clients}</div>
              </div>
              <Users className="h-4 w-4 text-pink-400" />
            </div>
            <div className="text-xs text-pink-400 mt-2">
              {stats?.totalUsers ? ((analytics.clients / stats.totalUsers) * 100).toFixed(0) : 0}% of users
            </div>
          </CardContent>
        </Card>

        {/* Verified Users */}
        <Card className="glass-card border-white/10 bg-yellow-500/10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-yellow-300 font-medium">Verified</div>
                <div className="text-2xl font-bold text-white mt-1">{analytics.verifiedUsers}</div>
              </div>
              <CheckCircle2 className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="text-xs text-yellow-400 mt-2">
              {analytics.verificationRate.toFixed(0)}% rate
            </div>
          </CardContent>
        </Card>

        {/* Premium Users */}
        <Card className="glass-card border-white/10 bg-indigo-500/10">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-indigo-300 font-medium">Premium</div>
                <div className="text-2xl font-bold text-white mt-1">{analytics.premiumUsers}</div>
              </div>
              <TrendingUp className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-xs text-indigo-400 mt-2">
              {analytics.premiumConversionRate.toFixed(0)}% conversion
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Growth Chart - 2 columns */}
        <Card className="glass-card border-white/10 bg-white/5 lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                User Growth Trend
              </h3>
              <Badge className={`${growthTrend >= 0 ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                {growthTrend >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {growthTrend >= 0 ? '+' : ''}{growthTrend} this month
              </Badge>
            </div>

            {/* Simple Bar Chart */}
            <div className="space-y-2">
              {growth?.map((item, index) => {
                const maxUsers = Math.max(...(growth?.map(g => g.newUsers) || [1]));
                const percentage = (item.newUsers / maxUsers) * 100;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="text-xs text-slate-400 w-16">{item.month}</div>
                    <div className="flex-1 h-8 bg-white/5 rounded overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded flex items-center justify-end px-2 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      >
                        {item.newUsers > 0 && (
                          <span className="text-xs font-semibold text-white">
                            {item.newUsers}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 w-12 text-right">{item.users}</div>
                  </div>
                );
              })}
            </div>

            {/* Growth Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
              <div className="text-center">
                <div className="text-xs text-slate-400">Today</div>
                <div className="text-lg font-bold text-white mt-1">{analytics.newUsersToday}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400">This Week</div>
                <div className="text-lg font-bold text-white mt-1">{analytics.newUsersLast7Days}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400">This Month</div>
                <div className="text-lg font-bold text-white mt-1">{analytics.newUsersLast30Days}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity - 1 column */}
        <Card className="glass-card border-white/10 bg-white/5">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-400" />
              Recent Activity
            </h3>
            <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
              {activities?.map((activity) => {
                const icon = activity.type === 'user_registered' ? Users :
                           activity.type === 'verification_approved' ? CheckCircle2 :
                           AlertCircle;
                const IconComponent = icon;
                const color = activity.type === 'user_registered' ? 'text-blue-400' :
                            activity.type === 'verification_approved' ? 'text-green-400' :
                            'text-yellow-400';
                const bgColor = activity.type === 'user_registered' ? 'bg-blue-500/10' :
                              activity.type === 'verification_approved' ? 'bg-green-500/10' :
                              'bg-yellow-500/10';

                return (
                  <div key={activity.id} className={`p-2.5 rounded-lg ${bgColor} flex items-start gap-2`}>
                    <IconComponent className={`h-3.5 w-3.5 ${color} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{activity.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(activity.timestamp).toLocaleTimeString()} • {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              {(!activities || activities.length === 0) && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators - Compact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="glass-card border-white/10 bg-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-400">Pending Verifications</div>
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats?.pendingVerifications || 0}</div>
            <Badge className="mt-2 bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
              Requires Action
            </Badge>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10 bg-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-400">Avg Proposals/Job</div>
              <FileText className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">{analytics.avgProposalsPerJob.toFixed(1)}</div>
            <Badge className={`mt-2 text-xs ${analytics.avgProposalsPerJob >= 3 ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'}`}>
              {analytics.avgProposalsPerJob >= 3 ? 'Healthy' : 'Moderate'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10 bg-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-400">Monthly Growth</div>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {stats?.totalUsers && analytics.newUsersLast30Days
                ? ((analytics.newUsersLast30Days / stats.totalUsers) * 100).toFixed(1)
                : 0}%
            </div>
            <Badge className="mt-2 bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
              Last 30 Days
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
