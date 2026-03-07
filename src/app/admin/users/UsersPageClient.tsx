'use client';

import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle,
  XCircle,
  Shield,
  Trash2,
  Eye,
  Users as UsersIcon,
  UserPlus,
  UserCheck,
  Filter,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import UserDetailModal from '@/components/admin/UserDetailModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/useDebounce';
import { SubscriptionPlan } from '@/types/database.types';

type AdminUserRole = 'ADMIN' | 'CLIENT' | 'FREELANCER';

type AdminUser = {
  id: string;
  email: string;
  role: AdminUserRole | string;
  subscriptionPlan?: string | null;
  isVerified?: boolean;
  createdAt: string | Date;
  Profile?: Array<{ firstName?: string | null; lastName?: string | null }> | { firstName?: string | null; lastName?: string | null } | null;
};

type VerificationFilter = 'ALL' | 'verified' | 'unverified';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [role, setRole] = useState<'ALL' | 'FREELANCER' | 'CLIENT' | 'ADMIN'>('ALL');
  const [verificationStatus, setVerificationStatus] = useState<VerificationFilter>('ALL');
  const [planFilter, setPlanFilter] = useState<'ALL' | SubscriptionPlan>('ALL');
  const [emailStatus, setEmailStatus] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL');
  const [sortBy, setSortBy] = useState<'createdAt' | 'email' | 'lastLoginAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<AdminUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const { data, isLoading, refetch } = trpc.admin.users.getUsers.useQuery({
    search: debouncedSearch || undefined,
    role: role,
    verificationStatus: verificationStatus,
    subscriptionPlan: planFilter === 'ALL' ? undefined : planFilter,
    emailVerified: emailStatus === 'ALL' ? undefined : emailStatus === 'VERIFIED',
    limit: pageSize,
    offset: page * pageSize,
    sortBy,
    sortOrder,
  });

  const { data: overview } = trpc.admin.users.getOverview.useQuery();

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, role, verificationStatus, planFilter, emailStatus, sortBy, sortOrder, pageSize]);

  const verifyMutation = trpc.admin.users.verifyUser.useMutation({
    onSuccess: () => {
      toast.success('User verified successfully');
      refetch();
      setVerifyTarget(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to verify user');
    },
  });

  const suspendMutation = trpc.admin.users.suspendUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
      setSuspendTarget(null);
      setSuspendReason('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to suspend user');
    },
  });

  const deleteMutation = trpc.admin.users.deleteUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
      setDeleteTarget(null);
      setDeleteReason('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });

  const users = useMemo<AdminUser[]>(() => {
    if (data && Array.isArray(data.users)) {
      return data.users as AdminUser[];
    }
    return [];
  }, [data]);
  const total = data?.total ?? users.length;
  const hasMore = data?.hasMore ?? users.length === pageSize;

  const handleRoleChange = (value: string) => {
    const nextRole = value as 'ALL' | AdminUserRole;
    setRole(nextRole);
    setPage(0);
  };

  const handleVerificationChange = (value: string) => {
    const nextStatus = value as VerificationFilter;
    setVerificationStatus(nextStatus);
    setPage(0);
  };

  const getRoleBadge = (userRole: string) => {
    const colors = {
      ADMIN: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      CLIENT: 'bg-green-500/20 text-green-300 border-green-500/30',
      FREELANCER: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    };
    return colors[userRole as keyof typeof colors] || 'bg-gray-500/20 text-gray-300';
  };

  const getPlanBadge = (plan: string) => {
    if (plan?.includes('ELITE') || plan?.includes('ENTERPRISE')) {
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    }
    if (plan?.includes('PRO') || plan?.includes('BUSINESS')) {
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
    return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  const handleVerifyUser = (user: AdminUser) => {
    setVerifyTarget(user);
  };

  const handleSuspendUser = (user: AdminUser) => {
    setSuspendTarget(user);
    setSuspendReason('');
  };

  const handleDeleteUser = (user: AdminUser) => {
    setDeleteTarget(user);
    setDeleteReason('');
  };

  const handleUnsuspendUser = (user: AdminUser) => {
    if (confirm('Unsuspend this user and resolve any fraud flags?')) {
      suspendMutation.mutate({ userId: user.id, suspend: false });
    }
  };

  const availablePlans = useMemo<SubscriptionPlan[]>(() => {
    const plans = new Set<SubscriptionPlan>();
    users.forEach((user) => {
      if (user.subscriptionPlan) {
        plans.add(user.subscriptionPlan as SubscriptionPlan);
      }
    });
    return Array.from(plans).sort();
  }, [users]);

  useEffect(() => {
    if (page > 0 && users.length === 0 && total > 0) {
      setPage((prev) => Math.max(prev - 1, 0));
    }
  }, [users.length, total, page]);

  const handleExport = () => {
    if (users.length === 0) {
      toast.info('No users to export for the current view.');
      return;
    }

    const header = ['ID', 'Email', 'Role', 'Plan', 'Verified', 'Created At'];
    const rows = users.map((user) => [
      user.id,
      user.email,
      user.role,
      user.subscriptionPlan ?? 'FREE',
      user.isVerified ? 'Yes' : 'No',
      user.createdAt ? new Date(user.createdAt).toISOString() : '',
    ]);

    const csv = [header, ...rows]
      .map((columns) => columns.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `users-export-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      {/* Compact Header with Inline Stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <UsersIcon className="h-5 w-5 text-blue-400" />
          <h1 className="text-xl font-bold text-white">User Management</h1>
        </div>

        {/* Inline Stats */}
        {overview && (
          <div className="flex items-center gap-3 flex-1 justify-center">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <UsersIcon className="h-4 w-4 text-blue-400" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-white">{overview.total}</span>
                <span className="text-xs text-blue-300">Total</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
              <UserCheck className="h-4 w-4 text-green-400" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-white">{overview.verified}</span>
                <span className="text-xs text-green-300">Verified</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <UserPlus className="h-4 w-4 text-purple-400" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-white">{overview.newThisWeek}</span>
                <span className="text-xs text-purple-300">New</span>
              </div>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-white hover:bg-white/5 h-8 px-3"
          onClick={handleExport}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs">Export</span>
        </Button>
      </div>

      {/* Compact Filters */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search by email or ID..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className="pl-8 pr-3 py-1.5 bg-white/5 border-white/10 text-sm text-white placeholder-slate-500 h-8"
                />
              </div>
            </div>

            {/* Role Filter */}
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="FREELANCER">Freelancers</SelectItem>
                <SelectItem value="CLIENT">Clients</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
              </SelectContent>
            </Select>

            {/* Verification Status */}
            <Select value={verificationStatus} onValueChange={handleVerificationChange}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>

            {/* Subscription Plan */}
            <Select value={planFilter} onValueChange={(value) => setPlanFilter(value as 'ALL' | SubscriptionPlan)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                <SelectValue placeholder="Subscription" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="ALL">All Plans</SelectItem>
                {availablePlans.map((plan) => (
                  <SelectItem key={plan} value={plan}>
                    {plan.replace('FREELANCER_', '').replace('CLIENT_', '')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Email Status */}
            <Select value={emailStatus} onValueChange={(value: 'ALL' | 'VERIFIED' | 'UNVERIFIED') => setEmailStatus(value)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                <SelectValue placeholder="Email" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="ALL">All emails</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="UNVERIFIED">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <Select value={sortBy} onValueChange={(value: 'createdAt' | 'email' | 'lastLoginAt') => setSortBy(value)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="createdAt">Joined Date</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="lastLoginAt">Last Login</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={`${pageSize}`} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Compact Users Table */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '30%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-400 py-8 text-sm">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const profileData = user.Profile;
                    const profile = Array.isArray(profileData) ? profileData[0] : profileData || null;
                    const fullName = profile
                      ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
                      : null;

                    return (
                      <tr
                        key={user.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-2.5 px-4 align-top">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                              {(fullName || user.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-white text-sm truncate">
                                {fullName || 'No name'}
                              </div>
                              <div className="text-xs text-slate-400 truncate">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 align-top">
                          <Badge variant="outline" className={`text-xs ${getRoleBadge(user.role)}`}>{user.role}</Badge>
                        </td>
                        <td className="py-2.5 px-4 align-top">
                          <Badge variant="outline" className={`text-xs ${getPlanBadge(user.subscriptionPlan ?? '')}`}>
                            {user.subscriptionPlan?.replace('FREELANCER_', '').replace('CLIENT_', '') || 'FREE'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 align-top">
                          {user.isVerified ? (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                              <span className="text-xs text-green-400">Verified</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <XCircle className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="text-xs text-yellow-400">Unverified</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 align-top">
                          <span className="text-xs text-slate-300">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 align-top">
                          <div className="flex items-center justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white h-7 w-7 p-0">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
                                <DropdownMenuLabel className="text-white text-xs">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                  onClick={() => setSelectedUserId(user.id)}
                                  className="text-slate-300 cursor-pointer hover:bg-white/5 text-xs"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {!user.isVerified && (
                                  <DropdownMenuItem
                                    onClick={() => handleVerifyUser(user)}
                                    className="text-green-400 cursor-pointer hover:bg-white/5 text-xs"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5 mr-2" />
                                    Verify User
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleSuspendUser(user)}
                                  className="text-yellow-400 cursor-pointer hover:bg-white/5 text-xs"
                                >
                                  <Shield className="h-3.5 w-3.5 mr-2" />
                                  Suspend
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleUnsuspendUser(user)}
                                  className="text-slate-300 cursor-pointer hover:bg-white/5 text-xs"
                                >
                                  <Shield className="h-3.5 w-3.5 mr-2" />
                                  Unsuspend
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteUser(user)}
                                  className="text-red-400 cursor-pointer hover:bg-red-500/10 text-xs"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Compact Pagination */}
      <div className="flex justify-between items-center px-1">
        <div className="text-xs text-slate-500">
          Showing {total === 0 ? 0 : page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total} users
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="border-white/10 text-white hover:bg-white/5 h-7 px-3 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="border-white/10 text-white hover:bg-white/5 h-7 px-3 text-xs"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUpdate={refetch}
        />
      )}

      <AlertDialog open={Boolean(verifyTarget)} onOpenChange={(open) => {
        if (!open) {
          setVerifyTarget(null);
        }
      }}>
        <AlertDialogContent className="bg-slate-950/95 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Verify user account</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the account as verified and approve any pending identity checks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              disabled={verifyMutation.isPending}
              onClick={() => {
                if (!verifyTarget) return;
                verifyMutation.mutate({ userId: verifyTarget.id });
              }}
            >
              {verifyMutation.isPending ? 'Verifying...' : 'Verify User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(suspendTarget)} onOpenChange={(open) => {
        if (!open) {
          setSuspendTarget(null);
          setSuspendReason('');
        }
      }}>
        <AlertDialogContent className="bg-slate-950/95 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend user</AlertDialogTitle>
            <AlertDialogDescription>
              The user will be flagged and prevented from accessing the platform until manually unsuspended.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-slate-500">Suspension reason</Label>
            <Textarea
              value={suspendReason}
              onChange={(event) => setSuspendReason(event.target.value)}
              placeholder="Provide a reason that will be stored in the audit log"
              className="bg-white/5 border-white/10 text-white text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-yellow-600 hover:bg-yellow-700"
              disabled={suspendMutation.isPending || suspendReason.trim().length === 0}
              onClick={() => {
                if (!suspendTarget) return;
                suspendMutation.mutate({ userId: suspendTarget.id, suspend: true, reason: suspendReason.trim() });
              }}
            >
              {suspendMutation.isPending ? 'Suspending...' : 'Suspend User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => {
        if (!open) {
          setDeleteTarget(null);
          setDeleteReason('');
        }
      }}>
        <AlertDialogContent className="bg-slate-950/95 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              The user account will be anonymized and access revoked. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-slate-500">Deletion reason</Label>
            <Textarea
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              placeholder="Reason to log for this deletion"
              className="bg-white/5 border-white/10 text-white text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending || deleteReason.trim().length === 0}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate({ userId: deleteTarget.id, reason: deleteReason.trim() });
              }}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
