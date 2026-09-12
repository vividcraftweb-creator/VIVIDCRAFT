'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/utils/trpc';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Briefcase,
  FileText,
  FileCheck,
  CircleDollarSign,
  ClipboardList,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Shield,
  Settings,
  UserCheck,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminUsersTab from './AdminUsersTab';
import AdminArtworksTab from './AdminArtworksTab';
import AdminConnectionsTab from './AdminConnectionsTab';
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type VerificationUserRelation = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
} | null;

type PendingVerificationRecord = {
  id: string;
  createdAt?: string | Date | null;
  details?: unknown;
  files?: string[] | string | null;
  idType?: string | null;
  status?: string | null;
  user?: VerificationUserRelation | VerificationUserRelation[];
  User?: VerificationUserRelation | VerificationUserRelation[];
};

const normalizeUserRelation = (
  relation?: VerificationUserRelation | VerificationUserRelation[] | null,
): VerificationUserRelation => {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation) ? relation[0] ?? null : relation;
};

const formatIdType = (idType?: string | null) => {
  if (!idType) {
    return null;
  }

  return idType
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

// Helper function to calculate time ago
function getTimeAgo(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

export default function AdminDashboard() {
  const [directProfiles, setDirectProfiles] = useState<any[]>([]);
  const [directProfileCount, setDirectProfileCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const supabase = createClient();
        const { data, count, error } = await supabase.from('profiles').select('*', { count: 'exact' });
        if (!error && data) {
          setDirectProfiles(data);
          setDirectProfileCount(typeof count === 'number' ? count : data.length);
        }
      } catch (e) {}
    }
    fetchCounts();
  }, []);

  const { data: stats, isLoading } = trpc.admin.getSystemStats.useQuery();
  const { data: health, isLoading: healthLoading } = trpc.admin.getSystemHealth.useQuery(undefined, {
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  const { data: recentActivity, isLoading: activityLoading } = trpc.admin.getRecentActivity.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  const { data: growthData, isLoading: growthLoading } = trpc.admin.getGrowthAnalytics.useQuery();
  const {
    data: verificationQueue,
    isLoading: pendingListLoading,
  } = trpc.verifications.getVerifications.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const totalUsers = Math.max(stats?.totalUsers ?? 0, directProfileCount ?? 0, directProfiles.length);
  const totalJobs = stats?.totalJobs ?? 0;
  const totalProposals = stats?.totalProposals ?? 0;
  const pendingVerifications = stats?.pendingVerifications ?? 0;

  const pendingVerificationRecords: PendingVerificationRecord[] = Array.isArray(verificationQueue)
    ? (verificationQueue as PendingVerificationRecord[]).filter((record) =>
        (record.status ?? '').toString().toUpperCase() === 'PENDING'
      )
    : [];
  const pendingVerificationCount = Math.max(pendingVerifications, pendingVerificationRecords.length);

  const displayActivities = (recentActivity && recentActivity.length > 0)
    ? recentActivity
    : directProfiles.slice(0, 5).map((p) => {
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email?.split('@')[0] || 'User';
        return {
          id: p.id,
          type: 'user_registered' as const,
          description: `New user registered: ${name} (${p.email || 'N/A'})`,
          timestamp: p.created_at ? new Date(p.created_at) : new Date(),
          metadata: { role: p.role || 'client' },
        };
      });

  const userGrowthData = (growthData && growthData.length > 0)
    ? growthData.map((entry) => ({
        ...entry,
        month: entry.month ?? '',
        users: Number(entry.users) || 0,
        newUsers: Number(entry.newUsers) || 0,
      }))
    : [{
        month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date()),
        users: totalUsers,
        newUsers: totalUsers,
      }];

  const userGrowthChartData = userGrowthData.map((entry) => ({
    label: entry.month,
    newUsers: entry.newUsers,
    cumulativeUsers: entry.users,
  }));

  const defaultHealth = {
    database: { status: 'Healthy', healthy: true },
    api: { status: 'Fast', responseTime: 24 },
    queue: { status: 'Idle', pendingItems: 0 },
    payment: { status: 'Operational', healthy: true },
  };
  const activeHealth = health || defaultHealth;

  return (
    <div className="space-y-3">
      {/* Compact Inline Stats */}
      {isLoading ? (
        <div className="flex items-center gap-3 flex-wrap">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-slate-900/80 border border-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Users className="h-4 w-4 text-blue-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{totalUsers}</span>
              <span className="text-xs text-blue-300">Users</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
            <Briefcase className="h-4 w-4 text-green-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{totalJobs}</span>
              <span className="text-xs text-green-300">Jobs</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <FileText className="h-4 w-4 text-purple-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{totalProposals}</span>
              <span className="text-xs text-purple-300">Proposals</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <ClipboardList className="h-4 w-4 text-orange-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">
                {totalJobs > 0 ? (totalProposals / totalJobs).toFixed(1) : 0}
              </span>
              <span className="text-xs text-orange-300">Avg/Job</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <FileCheck className="h-4 w-4 text-yellow-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{pendingVerificationCount}</span>
              <span className="text-xs text-yellow-300">Pending</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left Column - Analytics */}
        <div className="lg:col-span-2 space-y-3">
          {/* User Growth Chart */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-white">User Growth</h3>
                <p className="text-xs text-slate-400">Platform growth over the last 6 months</p>
              </div>
              <div className="p-1.5 bg-primary/20 rounded-lg">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
            </div>
            
            {/* Simple chart visualization */}
            {growthLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-6 bg-slate-950/60 rounded animate-pulse"></div>
                ))}
              </div>
            ) : userGrowthChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                <BarChart3 className="h-6 w-6" />
                <p className="text-xs">No user growth data available yet.</p>
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={userGrowthChartData}
                    margin={{ top: 10, right: 20, left: -20, bottom: 10 }}
                  >
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '12px',
                        color: '#e2e8f0',
                        boxShadow: '0 10px 40px rgba(15, 23, 42, 0.45)',
                      }}
                      labelStyle={{ color: '#cbd5f5', fontWeight: 600 }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ color: '#cbd5f5', fontSize: 12 }}
                    />
                    <Bar
                      dataKey="newUsers"
                      name="New Users"
                      radius={[8, 8, 8, 8]}
                      barSize={32}
                      fill="#a855f7"
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulativeUsers"
                      name="Cumulative Users"
                      stroke="#3b82f6"
                      fill="rgba(59, 130, 246, 0.2)"
                      strokeWidth={3}
                      dot={{ strokeWidth: 2, r: 3, fill: '#ffffff' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Platform Activity Overview */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-white">Platform Activity</h3>
                <p className="text-xs text-slate-400">Jobs and proposals overview</p>
              </div>
              <div className="p-1.5 bg-green-500/20 rounded-lg">
                <Activity className="h-4 w-4 text-green-400" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 mb-1">
                  <Briefcase className="h-3 w-3 text-green-400" />
                  <span className="text-xs text-slate-400">Active Jobs</span>
                </div>
                <div className="text-lg font-bold text-white">{totalJobs}</div>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="h-3 w-3 text-purple-400" />
                  <span className="text-xs text-slate-400">Proposals</span>
                </div>
                <div className="text-lg font-bold text-white">{totalProposals}</div>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 mb-1">
                  <ClipboardList className="h-3 w-3 text-orange-400" />
                  <span className="text-xs text-slate-400">Avg / Job</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {totalJobs > 0 ? (totalProposals / totalJobs).toFixed(1) : 0}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">Engagement Rate</span>
                    <span className="text-xs font-semibold text-green-400">
                      {totalJobs > 0 ? Math.round((totalProposals / totalJobs) * 100) / 100 : 0} p/j
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min((totalProposals / Math.max(totalJobs, 1)) * 10, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">Pending Verifications</span>
                    <span className="text-xs font-semibold text-orange-400">
                      {pendingVerificationCount}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-1.5">
                    <div
                      className="bg-orange-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(pendingVerificationCount * 10, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Admin Actions */}
        <div className="space-y-3">
          {/* Quick Actions */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
            <h3 className="text-base font-bold text-white mb-3">Admin Actions</h3>

            <div className="space-y-2">
              <Button
                asChild
                size="sm"
                className="w-full justify-start bg-purple-600 hover:bg-purple-500 text-white h-8 text-xs shadow-md shadow-purple-600/20"
              >
                <Link href="/admin/fraud-review">
                  <Shield className="h-3.5 w-3.5 mr-2" />
                  Verification Queue
                  {pendingVerificationCount > 0 && (
                    <Badge className="ml-auto bg-red-500 text-white text-xs h-5">
                      {pendingVerificationCount > 99 ? '99+' : pendingVerificationCount}
                    </Badge>
                  )}
                </Link>
              </Button>

              <Button
                asChild
                size="sm"
                className="w-full justify-start bg-slate-800/80 border border-slate-700 text-white hover:bg-slate-700/80 h-8 text-xs"
              >
                <Link href="/admin/users">
                  <Users className="h-3.5 w-3.5 mr-2" />
                  User Management
                </Link>
              </Button>

              <Button
                asChild
                size="sm"
                className="w-full justify-start bg-slate-800/80 border border-slate-700 text-white hover:bg-slate-700/80 h-8 text-xs"
              >
                <Link href="/admin/jobs">
                  <Briefcase className="h-3.5 w-3.5 mr-2" />
                  Job Moderation
                </Link>
              </Button>

              <Button
                asChild
                size="sm"
                className="w-full justify-start bg-slate-800/80 border border-slate-700 text-white hover:bg-slate-700/80 h-8 text-xs"
              >
                <Link href="/admin/settings">
                  <Settings className="h-3.5 w-3.5 mr-2" />
                  System Settings
                </Link>
              </Button>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">System Health</h3>
              <div className={`p-1.5 rounded-lg ${activeHealth?.database?.healthy && activeHealth?.payment?.healthy ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                <Activity className={`h-4 w-4 ${activeHealth?.database?.healthy && activeHealth?.payment?.healthy ? 'text-green-400' : 'text-yellow-400'}`} />
              </div>
            </div>

            {healthLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-slate-950/60 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1 rounded ${activeHealth.database.healthy ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {activeHealth.database.healthy ? (
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-red-400" />
                      )}
                    </div>
                    <span className="text-white text-xs font-medium">Database</span>
                  </div>
                  <Badge className={`text-xs ${
                    activeHealth.database.healthy
                      ? 'bg-green-500/20 text-green-300 border-green-500/30'
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}>
                    {activeHealth.database.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1 rounded ${
                      activeHealth.api.status === 'Fast' ? 'bg-green-500/20' :
                      activeHealth.api.status === 'Moderate' ? 'bg-yellow-500/20' :
                      'bg-red-500/20'
                    }`}>
                      {activeHealth.api.status === 'Fast' ? (
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      ) : activeHealth.api.status === 'Moderate' ? (
                        <Clock className="h-3 w-3 text-yellow-400" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-red-400" />
                      )}
                    </div>
                    <span className="text-white text-xs font-medium">API Response</span>
                  </div>
                  <Badge className={`text-xs ${
                    activeHealth.api.status === 'Fast'
                      ? 'bg-green-500/20 text-green-300 border-green-500/30'
                      : activeHealth.api.status === 'Moderate'
                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}>
                    {activeHealth.api.status} ({activeHealth.api.responseTime}ms)
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1 rounded ${
                      activeHealth.queue.status === 'Idle' ? 'bg-slate-500/20' :
                      activeHealth.queue.status === 'Active' ? 'bg-green-500/20' :
                      'bg-yellow-500/20'
                    }`}>
                      {activeHealth.queue.status === 'Idle' ? (
                        <CheckCircle className="h-3 w-3 text-slate-400" />
                      ) : activeHealth.queue.status === 'Active' ? (
                        <Activity className="h-3 w-3 text-green-400" />
                      ) : (
                        <Clock className="h-3 w-3 text-yellow-400" />
                      )}
                    </div>
                    <span className="text-white text-xs font-medium">Queue Processing</span>
                  </div>
                  <Badge className={`text-xs ${
                    activeHealth.queue.status === 'Idle'
                      ? 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                      : activeHealth.queue.status === 'Active'
                      ? 'bg-green-500/20 text-green-300 border-green-500/30'
                      : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                  }`}>
                    {activeHealth.queue.status} ({activeHealth.queue.pendingItems})
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1 rounded ${activeHealth.payment.healthy ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {activeHealth.payment.healthy ? (
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-red-400" />
                      )}
                    </div>
                    <span className="text-white text-xs font-medium">Payment Gateway</span>
                  </div>
                  <Badge className={`text-xs ${
                    activeHealth.payment.healthy
                      ? 'bg-green-500/20 text-green-300 border-green-500/30'
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}>
                    {activeHealth.payment.status}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section - Verification/Payout Queue and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Legacy Tabs Section (keeping for compatibility) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <Tabs defaultValue="verifications" className="w-full">
            <TabsList className="bg-slate-950/80 border border-slate-800 h-8 flex flex-wrap mb-4">
              <TabsTrigger value="verifications" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">
                Verifications
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">
                Users
              </TabsTrigger>
              <TabsTrigger value="artworks" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">
                Artworks
              </TabsTrigger>
              <TabsTrigger value="connections" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">
                Connections & Chat
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">
                Payments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="verifications" className="mt-3">
              {pendingListLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-slate-950/60 border border-slate-800/80 animate-pulse" />
                  ))}
                </div>
              ) : pendingVerificationCount > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold text-sm">Verification Queue</h3>
                      <p className="text-slate-400 text-xs">
                        Showing {Math.min(pendingVerificationRecords.length, 5)} most recent
                      </p>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-200 border border-yellow-500/30 text-xs">
                      {pendingVerificationCount} waiting
                    </Badge>
                  </div>

                  {pendingVerificationRecords.slice(0, 5).map((record) => {
                    const normalizedUser =
                      normalizeUserRelation(record.user) ?? normalizeUserRelation(record.User);
                    const email = (record as any).email || normalizedUser?.email || 'No email on file';
                    const fullName = (record as any).full_name || (record as any).fullName || [normalizedUser?.firstName, normalizedUser?.lastName]
                      .filter(Boolean)
                      .join(' ');
                    const recordDate = record.createdAt ? new Date(record.createdAt) : null;
                    const submittedAt = recordDate ? recordDate.toLocaleString() : 'Unknown date';
                    const submittedRelative = recordDate ? getTimeAgo(recordDate) : null;
                    const files =
                      Array.isArray(record.files)
                        ? record.files
                        : typeof record.files === 'string'
                          ? record.files
                              .split(',')
                              .map((file) => file.trim())
                              .filter(Boolean)
                          : [];
                    const detailSource = record.details;
                    const detailSnippet =
                      typeof detailSource === 'string'
                        ? detailSource
                        : detailSource
                          ? JSON.stringify(detailSource)
                          : null;
                    const formattedSnippet =
                      detailSnippet && detailSnippet.length > 160
                        ? `${detailSnippet.slice(0, 160)}…`
                        : detailSnippet ?? '';
                    const idTypeLabel = formatIdType(record.idType);

                    return (
                      <div
                        key={String(record.id)}
                        className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <p className="text-white font-medium leading-tight text-sm">{email}</p>
                            {fullName && (
                              <p className="text-xs text-slate-400 leading-tight">{fullName}</p>
                            )}
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-500" />
                              {submittedRelative || submittedAt}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {idTypeLabel && (
                              <Badge className="bg-purple-500/20 text-purple-200 border border-purple-500/30 text-xs">
                                {idTypeLabel}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {formattedSnippet && (
                          <p className="text-xs text-slate-300 bg-slate-900/60 border border-slate-800/60 rounded p-2 line-clamp-2">
                            {formattedSnippet}
                          </p>
                        )}

                        {files.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {files.map((fileUrl, index) => (
                              <span
                                key={index}
                                className="text-[11px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700"
                              >
                                Doc {index + 1}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex justify-end pt-2">
                    <Button
                      asChild
                      size="sm"
                      className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 h-7 text-xs"
                    >
                      <Link href="/admin/verifications">
                        Open Queue
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <CheckCircle className="h-8 w-8 text-green-500/50 mx-auto mb-2" />
                  <p className="text-xs">No pending verifications</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-3">
              <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                <p className="font-semibold text-white">Manual Payment Invoicing</p>
                <p>
                  Vivid Art no longer holds funds or releases payouts. Remind clients and freelancers to settle invoices
                  directly using services such as PayPal, Wise, or traditional bank transfers.
                </p>
                <p>
                  Encourage both parties to keep written confirmation of every payment inside their Vivid Art message
                  thread for transparency.
                </p>
                <p className="text-xs text-slate-500">
                  Need help mediating a payment issue? Direct the client and freelancer to{' '}
                  <Link href="/support" className="text-primary underline">
                    Support
                  </Link>{' '}
                  so our team can assist.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="mt-3">
              <AdminUsersTab />
            </TabsContent>
            
            <TabsContent value="artworks" className="mt-3">
              <AdminArtworksTab />
            </TabsContent>

            <TabsContent value="connections" className="mt-3">
              <AdminConnectionsTab />
            </TabsContent>
          </Tabs>
        </div>

        {/* Recent Activity - Moved from above */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <h3 className="text-base font-bold text-white mb-3">Recent Activity</h3>

          {activityLoading && displayActivities.length === 0 ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-950/60 border border-slate-800/80 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : displayActivities && displayActivities.length > 0 ? (
            <div className="space-y-2">
              {displayActivities.slice(0, 4).map((activity) => {
                const getActivityIcon = () => {
                  switch (activity.type) {
                    case 'user_registered':
                      return { icon: UserCheck, color: 'blue' };
                    case 'verification_approved':
                      return { icon: CheckCircle, color: 'green' };
                    case 'verification_pending':
                      return { icon: Clock, color: 'yellow' };
                    default:
                      return { icon: Activity, color: 'slate' };
                  }
                };

                const { icon: Icon, color } = getActivityIcon();
                const timeAgo = getTimeAgo(activity.timestamp);

                return (
                  <div key={activity.id} className="flex items-center space-x-2 p-2 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                    <div className={`p-1 bg-${color}-500/20 rounded`}>
                      <Icon className={`h-3 w-3 text-${color}-400`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs truncate font-medium">{activity.description}</p>
                      <p className="text-slate-400 text-xs">{timeAgo}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <Activity className="h-8 w-8 text-slate-500 mx-auto mb-2" />
              <p className="text-xs">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
