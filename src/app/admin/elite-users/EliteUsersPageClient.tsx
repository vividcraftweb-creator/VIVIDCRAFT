'use client';

import { trpc } from '@/utils/trpc';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Crown, User, Mail, UserCheck, Users } from 'lucide-react';
import { useAuth as useSession } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type ManagerProfile = {
  firstName: string | null;
  lastName: string | null;
};

type EliteUser = {
  id: string;
  email: string;
  subscriptionPlan: string | null;
  accountManagerId: string | null;
  profile: ManagerProfile | null;
  accountManager: {
    id: string;
    email: string;
    profile: ManagerProfile | null;
  } | null;
};

type AccountManager = {
  id: string;
  email: string;
  profile: ManagerProfile | null;
  managedUsers: { id: string }[];
};

type RawEliteUser = {
  id: string;
  email: string;
  subscriptionPlan: string | null;
  accountManagerId: string | null;
  accountManager: Array<{
    id: string;
    email: string;
    Profile: ManagerProfile[];
  }> | null;
  Profile: ManagerProfile[];
};

export default function EliteUsersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedManager, setSelectedManager] = useState<Record<string, string | null>>({});

  const { data: eliteUsers, isLoading: loadingUsers, refetch } = trpc.admin.getEliteUsers.useQuery();
  const { data: managersData, isLoading: loadingManagers } = trpc.admin.getAccountManagers.useQuery();

  const managers: AccountManager[] = useMemo(() => {
    if (!managersData) return [];
    return managersData.map(m => ({
      id: m.id,
      email: m.email,
      profile: Array.isArray(m.Profile) ? m.Profile[0] : m.Profile,
      managedUsers: []
    }));
  }, [managersData]);

  const assignMutation = trpc.admin.assignAccountManager.useMutation({
    onSuccess: () => {
      toast.success('Account manager assigned successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to assign account manager');
    },
  });

  const normalizedUsers: EliteUser[] = useMemo(() => {
    if (!eliteUsers) return [];

    return (eliteUsers as RawEliteUser[]).map((user) => {
      const profileRecord = Array.isArray(user.Profile) ? user.Profile[0] : user.Profile;
      const managerRecord = user.accountManager?.[0];

      return {
        id: user.id,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        accountManagerId: user.accountManagerId,
        profile: profileRecord ?? null,
        accountManager: managerRecord
          ? {
              id: managerRecord.id,
              email: managerRecord.email,
              profile: managerRecord.Profile?.[0] ?? null,
            }
          : null,
      };
    });
  }, [eliteUsers]);

  if (status === 'authenticated' && session?.session?.user?.role !== 'ADMIN') {
    router.push('/dashboard');
    return null;
  }

  const handleAssign = async (userId: string, managerId: string | null) => {
    await assignMutation.mutateAsync({
      userId,
      managerId: managerId === 'unassigned' ? null : managerId,
    });
    setSelectedManager((prev) => ({ ...prev, [userId]: null }));
  };

  if (status === 'loading' || loadingUsers || loadingManagers) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-white/5 rounded w-1/4"></div>
          <div className="h-12 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  const assignedUsers = normalizedUsers.filter(u => u.accountManagerId).length;
  const unassignedUsers = normalizedUsers.filter(u => !u.accountManagerId).length;

  return (
    <div className="space-y-3">
      {/* Compact Header with Inline Stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Crown className="h-5 w-5 text-yellow-400" />
          <h1 className="text-xl font-bold text-white">Elite Users Management</h1>
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <Crown className="h-4 w-4 text-yellow-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{normalizedUsers.length}</span>
              <span className="text-xs text-slate-400">Elite Users</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <UserCheck className="h-4 w-4 text-green-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{assignedUsers}</span>
              <span className="text-xs text-slate-400">Assigned</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <Users className="h-4 w-4 text-orange-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{unassignedUsers}</span>
              <span className="text-xs text-slate-400">Unassigned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Elite Users Table */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
        <CardContent className="p-0">
          {normalizedUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Crown className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-sm">No Elite users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead className="border-b border-slate-800 bg-slate-950/60">
                  <tr>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Manager</th>
                    <th className="text-center py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedUsers.map((user) => {
                    const currentManagerId = selectedManager[user.id] ?? user.accountManagerId ?? 'unassigned';
                    const hasChanged = currentManagerId !== (user.accountManagerId ?? 'unassigned');
                    const userName = user.profile?.firstName || user.profile?.lastName
                      ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
                      : 'Unnamed User';

                    return (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-4 align-top">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                              {userName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-white text-sm truncate flex items-center gap-1.5">
                                {userName}
                                <Crown className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              </div>
                              <span className="text-xs text-slate-500">ID: {user.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 align-top">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-white truncate">{user.email}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 align-top">
                          <Select
                            value={currentManagerId}
                            onValueChange={(value) =>
                              setSelectedManager((prev) => ({ ...prev, [user.id]: value }))
                            }
                          >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                              <SelectValue placeholder="Select manager" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10">
                              <SelectItem value="unassigned">
                                <span className="text-slate-400">No manager assigned</span>
                              </SelectItem>
                              {managers?.map((manager) => (
                                <SelectItem key={manager.id} value={manager.id}>
                                  {manager.profile?.firstName || manager.profile?.lastName
                                    ? `${manager.profile.firstName || ''} ${manager.profile.lastName || ''}`.trim()
                                    : manager.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {user.accountManager && !hasChanged && (
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              Current: {user.accountManager.profile?.firstName ||
                              user.accountManager.profile?.lastName
                                ? `${user.accountManager.profile.firstName || ''} ${user.accountManager.profile.lastName || ''}`.trim()
                                : user.accountManager.email}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 align-top">
                          <div className="flex items-center justify-center">
                            {hasChanged && (
                              <Button
                                onClick={() => handleAssign(user.id, currentManagerId)}
                                disabled={assignMutation.isPending}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 h-7 px-3 text-xs"
                              >
                                {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compact Account Managers Overview */}
      {managers && managers.length > 0 && (
        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              Account Managers Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {managers.map((manager) => {
                const managerName = manager.profile?.firstName || manager.profile?.lastName
                  ? `${manager.profile.firstName || ''} ${manager.profile.lastName || ''}`.trim()
                  : manager.email;
                const managedCount = normalizedUsers.filter(u => u.accountManagerId === manager.id).length;

                return (
                  <div
                    key={manager.id}
                    className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white text-sm truncate">{managerName}</div>
                        <div className="text-xs text-slate-400 truncate">{manager.email}</div>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs ml-2 flex-shrink-0">
                        {managedCount} {managedCount === 1 ? 'user' : 'users'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
