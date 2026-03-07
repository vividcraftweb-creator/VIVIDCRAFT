'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import {
  CreditCard,
  Users,
  TrendingUp,
  DollarSign,
  Search,
  ChevronDown,
  Calendar,
  ArrowUpDown,
  Filter,
  Download,
  RefreshCw,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { useMemo, useState, Fragment } from 'react';

type SortField = 'email' | 'createdAt' | 'plan' | 'role';
type SortOrder = 'asc' | 'desc';

export default function AdminSubscriptionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: subscriptions, isLoading, refetch } = trpc.admin.users.getUsers.useQuery({
    limit: 100,
    offset: 0
  });

  const users = useMemo(() => subscriptions?.users ?? [], [subscriptions]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSubscriptions = users.length;
    const activeSubscriptions = users.filter(u =>
      u.subscriptionPlan !== 'FREELANCER_FREE' && u.subscriptionPlan !== 'CLIENT_STARTER'
    ).length;
    const freeUsers = users.filter(u =>
      u.subscriptionPlan === 'FREELANCER_FREE' || u.subscriptionPlan === 'CLIENT_STARTER'
    ).length;
    const verifiedUsers = users.filter(u => u.isVerified).length;
    const premiumPercentage = totalSubscriptions > 0
      ? ((activeSubscriptions / totalSubscriptions) * 100).toFixed(1)
      : '0.0';

    // Plan distribution
    const planCounts = users.reduce((acc, user) => {
      const plan = user.subscriptionPlan || 'FREELANCER_FREE';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSubscriptions,
      activeSubscriptions,
      freeUsers,
      verifiedUsers,
      premiumPercentage,
      planCounts
    };
  }, [users]);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlan = filterPlan === 'all' || user.subscriptionPlan === filterPlan;
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'verified' && user.isVerified) ||
        (filterStatus === 'unverified' && !user.isVerified);
      return matchesSearch && matchesPlan && matchesRole && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = sortField === 'plan' ? a.subscriptionPlan : a[sortField];
      let bVal: any = sortField === 'plan' ? b.subscriptionPlan : b[sortField];

      if (sortField === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchTerm, filterPlan, filterRole, filterStatus, sortField, sortOrder]);

  const getPlanBadge = (plan: string) => {
    const planColors: Record<string, string> = {
      'FREELANCER_FREE': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      'FREELANCER_PRO': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'FREELANCER_ELITE': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'CLIENT_STARTER': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      'CLIENT_BUSINESS': 'bg-green-500/20 text-green-300 border-green-500/30',
      'CLIENT_ENTERPRISE': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    };
    return planColors[plan] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  const getPlanName = (plan: string) => {
    const names: Record<string, string> = {
      'FREELANCER_FREE': 'Free',
      'FREELANCER_PRO': 'Pro',
      'FREELANCER_ELITE': 'Elite',
      'CLIENT_STARTER': 'Starter',
      'CLIENT_BUSINESS': 'Business',
      'CLIENT_ENTERPRISE': 'Enterprise',
    };
    return names[plan] || plan;
  };

  const getPlanPrice = (plan: string) => {
    const prices: Record<string, string> = {
      'FREELANCER_FREE': '$0/mo',
      'FREELANCER_PRO': '$29/mo',
      'FREELANCER_ELITE': '$99/mo',
      'CLIENT_STARTER': '$0/mo',
      'CLIENT_BUSINESS': '$149/mo',
      'CLIENT_ENTERPRISE': '$499/mo',
    };
    return prices[plan] || '$0/mo';
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleRowExpansion = (userId: string) => {
    setExpandedRow(expandedRow === userId ? null : userId);
  };

  const exportData = () => {
    const csv = [
      ['Email', 'Role', 'Plan', 'Price', 'Status', 'Joined'].join(','),
      ...filteredUsers.map(u => [
        u.email,
        u.role,
        getPlanName(u.subscriptionPlan),
        getPlanPrice(u.subscriptionPlan),
        u.isVerified ? 'Verified' : 'Unverified',
        new Date(u.createdAt).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/5 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-white/5 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-white/5 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage user subscriptions and plans</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          <Button
            onClick={exportData}
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white hover:bg-white/10"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="glass-card border-white/10 bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-300/80 font-medium">Total Users</div>
                <div className="text-2xl font-bold text-white mt-0.5">{stats.totalSubscriptions}</div>
              </div>
              <div className="p-2.5 bg-blue-500/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10 bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-green-300/80 font-medium">Premium</div>
                <div className="text-2xl font-bold text-white mt-0.5">{stats.activeSubscriptions}</div>
                <div className="text-xs text-green-400/70 mt-0.5">{stats.premiumPercentage}% conversion</div>
              </div>
              <div className="p-2.5 bg-green-500/20 rounded-lg">
                <CreditCard className="h-5 w-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10 bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-purple-300/80 font-medium">Free Tier</div>
                <div className="text-2xl font-bold text-white mt-0.5">{stats.freeUsers}</div>
                <div className="text-xs text-purple-400/70 mt-0.5">
                  {((stats.freeUsers/stats.totalSubscriptions) * 100).toFixed(1)}% of total
                </div>
              </div>
              <div className="p-2.5 bg-purple-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10 bg-gradient-to-br from-orange-500/10 to-orange-600/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-orange-300/80 font-medium">Verified</div>
                <div className="text-2xl font-bold text-white mt-0.5">{stats.verifiedUsers}</div>
                <div className="text-xs text-orange-400/70 mt-0.5">
                  {((stats.verifiedUsers/stats.totalSubscriptions) * 100).toFixed(1)}% verified
                </div>
              </div>
              <div className="p-2.5 bg-orange-500/20 rounded-lg">
                <Shield className="h-5 w-5 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution - Compact */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Plan Distribution</h3>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(stats.planCounts).map(([plan, count]) => (
              <div key={plan} className="flex flex-col items-center justify-center p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                <div className="text-xl font-bold text-white">{count as number}</div>
                <Badge className={`mt-1.5 text-xs ${getPlanBadge(plan)}`}>
                  {getPlanName(plan)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap md:flex-nowrap">
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all" className="bg-slate-900">All Plans</option>
                <option value="FREELANCER_FREE" className="bg-slate-900">Freelancer Free</option>
                <option value="FREELANCER_PRO" className="bg-slate-900">Freelancer Pro</option>
                <option value="FREELANCER_ELITE" className="bg-slate-900">Freelancer Elite</option>
                <option value="CLIENT_STARTER" className="bg-slate-900">Client Starter</option>
                <option value="CLIENT_BUSINESS" className="bg-slate-900">Client Business</option>
                <option value="CLIENT_ENTERPRISE" className="bg-slate-900">Client Enterprise</option>
              </select>

              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all" className="bg-slate-900">All Roles</option>
                <option value="FREELANCER" className="bg-slate-900">Freelancer</option>
                <option value="CLIENT" className="bg-slate-900">Client</option>
                <option value="ADMIN" className="bg-slate-900">Admin</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all" className="bg-slate-900">All Status</option>
                <option value="verified" className="bg-slate-900">Verified</option>
                <option value="unverified" className="bg-slate-900">Unverified</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {filteredUsers.length} of {users.length} users</span>
            {(searchTerm || filterPlan !== 'all' || filterRole !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterPlan('all');
                  setFilterRole('all');
                  setFilterStatus('all');
                }}
                className="text-blue-400 hover:text-blue-300"
              >
                Clear filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compact Table */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      User
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                    <button
                      onClick={() => handleSort('role')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Role
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                    <button
                      onClick={() => handleSort('plan')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Subscription
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                    <button
                      onClick={() => handleSort('createdAt')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Joined
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <Fragment key={user.id}>
                    <tr
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => toggleRowExpansion(user.id)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white font-medium truncate max-w-[200px]">
                              {user.email}
                            </span>
                            {user.isVerified && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-slate-500 font-mono">{user.id.slice(0, 8)}...</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`text-xs ${
                          user.role === 'FREELANCER' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                          user.role === 'CLIENT' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                          'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <Badge className={`text-xs w-fit ${getPlanBadge(user.subscriptionPlan)}`}>
                            {getPlanName(user.subscriptionPlan)}
                          </Badge>
                          <span className="text-xs text-slate-400">{getPlanPrice(user.subscriptionPlan)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {user.isVerified ? (
                            <>
                              <div className="h-2 w-2 rounded-full bg-green-500"></div>
                              <span className="text-xs text-green-400">Verified</span>
                            </>
                          ) : (
                            <>
                              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                              <span className="text-xs text-yellow-400">Pending</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center text-xs text-slate-400">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(user.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-white hover:bg-white/10 h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowExpansion(user.id);
                          }}
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${expandedRow === user.id ? 'rotate-180' : ''}`}
                          />
                        </Button>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedRow === user.id && (
                      <tr className="bg-white/5 border-b border-white/5">
                        <td colSpan={6} className="py-4 px-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Account Details */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Account Details
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start justify-between">
                                  <span className="text-slate-400">Email:</span>
                                  <span className="text-white font-medium text-right">{user.email}</span>
                                </div>
                                <div className="flex items-start justify-between">
                                  <span className="text-slate-400">User ID:</span>
                                  <span className="text-white font-mono text-xs">{user.id}</span>
                                </div>
                                <div className="flex items-start justify-between">
                                  <span className="text-slate-400">Role:</span>
                                  <Badge className={`text-xs ${
                                    user.role === 'FREELANCER' ? 'bg-blue-500/20 text-blue-300' :
                                    user.role === 'CLIENT' ? 'bg-green-500/20 text-green-300' :
                                    'bg-purple-500/20 text-purple-300'
                                  }`}>
                                    {user.role}
                                  </Badge>
                                </div>
                                <div className="flex items-start justify-between">
                                  <span className="text-slate-400">Verification:</span>
                                  <Badge className={`text-xs ${
                                    user.isVerified
                                      ? 'bg-green-500/20 text-green-300'
                                      : 'bg-yellow-500/20 text-yellow-300'
                                  }`}>
                                    {user.isVerified ? 'Verified' : 'Unverified'}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Subscription Details */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Subscription
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start justify-between">
                                  <span className="text-slate-400">Plan:</span>
                                  <Badge className={`text-xs ${getPlanBadge(user.subscriptionPlan)}`}>
                                    {getPlanName(user.subscriptionPlan)}
                                  </Badge>
                                </div>
                                <div className="flex items-start justify-between">
                                  <span className="text-slate-400">Price:</span>
                                  <span className="text-white font-semibold">{getPlanPrice(user.subscriptionPlan)}</span>
                                </div>
                                <div className="flex items-start justify-between">
                                  <span className="text-slate-400">Type:</span>
                                  <span className="text-white">
                                    {user.subscriptionPlan.includes('FREE') || user.subscriptionPlan.includes('STARTER')
                                      ? 'Free Tier'
                                      : 'Premium'}
                                  </span>
                                </div>
                                <div className="flex items-start justify-between">
                                  <span className="text-slate-400">Started:</span>
                                  <span className="text-white text-xs">
                                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Filter className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No subscriptions found matching your criteria</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterPlan('all');
                    setFilterRole('all');
                    setFilterStatus('all');
                  }}
                  className="text-blue-400 hover:text-blue-300 text-sm mt-2"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
