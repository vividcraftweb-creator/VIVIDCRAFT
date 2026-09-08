'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  TrendingDown,
  Search,
  User,
  UserCheck,
  UserX,
  Ban,
} from 'lucide-react';
import { useState } from 'react';
import { formatRole } from '@/lib/utils';

export default function FraudReviewPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Get users with potential fraud indicators
  const { data: usersData, isLoading, refetch } = trpc.admin.users.getUsers.useQuery({
    limit: 100,
    offset: 0
  });

  const users = usersData?.users || [];

  // Calculate fraud-related statistics
  const suspiciousUsers = users.filter(u => !u.isVerified && u.profileCompleted);
  const verifiedUsers = users.filter(u => u.isVerified);
  const totalUsers = users.length;
  const verifiedPercentage = totalUsers > 0 ? ((verifiedUsers.length / totalUsers) * 100).toFixed(0) : '0';

  // Trust score calculation based on verification and profile completion
  const getUserTrustScore = (user: typeof users[0]) => {
    let score = 50; // Base score
    if (user.isVerified) score += 30;
    if (user.profileCompleted) score += 20;
    return score;
  };

  // Flag type simulation
  const getFlagType = (user: typeof users[0]) => {
    if (!user.isVerified && user.profileCompleted) return 'UNVERIFIED_ACTIVITY';
    if (!user.profileCompleted) return 'INCOMPLETE_PROFILE';
    return 'NONE';
  };

  // Risk level calculation
  const getRiskLevel = (trustScore: number) => {
    if (trustScore < 60) return 'HIGH';
    if (trustScore < 80) return 'MEDIUM';
    return 'LOW';
  };

  // Filtered users with fraud indicators
  const flaggedUsers = users
    .filter(user => {
      const trustScore = getUserTrustScore(user);
      const hasFlag = trustScore < 80;
      const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterStatus === 'high_risk') return hasFlag && trustScore < 60 && matchesSearch;
      if (filterStatus === 'medium_risk') return hasFlag && trustScore >= 60 && trustScore < 80 && matchesSearch;
      if (filterStatus === 'verified') return user.isVerified && matchesSearch;

      return hasFlag && matchesSearch; // 'all' or default
    })
    .slice(0, 50); // Limit to 50 for performance

  // Calculate time since registration
  const getTimeSince = (date: string | Date) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-white/5 rounded w-1/4"></div>
          <div className="h-12 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Header with Stats and Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-red-400" />
          <h1 className="text-xl font-bold text-white">Fraud Detection</h1>
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{flaggedUsers.length}</span>
              <span className="text-xs text-slate-400">Flags</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <TrendingDown className="h-4 w-4 text-orange-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{users.filter(u => getUserTrustScore(u) < 60).length}</span>
              <span className="text-xs text-slate-400">High Risk</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <XCircle className="h-4 w-4 text-yellow-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{suspiciousUsers.length}</span>
              <span className="text-xs text-slate-400">Unverified</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{verifiedUsers.length}</span>
              <span className="text-xs text-slate-400">Verified</span>
            </div>
          </div>
        </div>

        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 bg-slate-900 border-slate-800 text-white hover:bg-slate-800 h-8 px-3"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="text-xs">Refresh</span>
        </Button>
      </div>

      {/* Compact Filter Bar */}
      <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg p-2 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="all" className="bg-slate-900">All Flags</option>
          <option value="high_risk" className="bg-slate-900">High Risk</option>
          <option value="medium_risk" className="bg-slate-900">Medium Risk</option>
          <option value="verified" className="bg-slate-900">Verified Only</option>
        </select>
      </div>

      {/* Compact Table */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead className="border-b border-slate-800 bg-slate-950/60">
                <tr>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Risk</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Trust</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Flag</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Verification</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered</th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flaggedUsers.map((user) => {
                  const trustScore = getUserTrustScore(user);
                  const flagType = getFlagType(user);
                  const riskLevel = getRiskLevel(trustScore);

                  return (
                    <tr key={user.id} className="border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 align-top">
                        <div className="flex flex-col">
                          <span className="text-sm text-white font-medium truncate">{user.email}</span>
                          <span className="text-xs text-slate-500">ID: {user.id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <Badge variant="outline" className={`text-xs font-semibold inline-flex ${
                          formatRole(user.role) === 'ARTIST' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' :
                          user.role === 'CLIENT' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                          'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        }`}>
                          {formatRole(user.role)}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <Badge variant="outline" className={`text-xs font-semibold inline-flex ${
                          riskLevel === 'HIGH' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                          riskLevel === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                          'bg-green-500/10 text-green-400 border-green-500/30'
                        }`}>
                          {riskLevel}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold tabular-nums min-w-[24px] ${
                            trustScore < 60 ? 'text-red-400' :
                            trustScore < 80 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {trustScore}
                          </span>
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                trustScore < 60 ? 'bg-red-500' :
                                trustScore < 80 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${trustScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <span className="text-xs text-slate-400 block">{flagType.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <div className="flex items-center gap-2">
                          {user.isVerified ? (
                            <UserCheck className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          )}
                          <span className={`text-xs whitespace-nowrap ${user.isVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                            {user.isVerified ? 'Verified' : 'Unverified'}
                          </span>
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${user.profileCompleted ? 'bg-green-400' : 'bg-red-400'}`}
                               title={user.profileCompleted ? 'Profile Complete' : 'Profile Incomplete'} />
                        </div>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {new Date(user.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-slate-600 whitespace-nowrap">{getTimeSince(user.createdAt)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-white hover:bg-white/10 h-7 w-7 p-0 flex-shrink-0"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 h-7 w-7 p-0 flex-shrink-0"
                            title="Suspend User"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0 flex-shrink-0"
                            title="Ban User"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {flaggedUsers.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <Shield className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                <p className="text-sm">No fraud flags found</p>
                <p className="text-xs mt-1 text-slate-500">All users appear legitimate</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compact Footer */}
      {flaggedUsers.length > 0 && (
        <div className="text-xs text-slate-500 flex items-center justify-between px-1">
          <span>Showing {flaggedUsers.length} of {totalUsers} users</span>
          <span>Updated: {new Date().toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}
