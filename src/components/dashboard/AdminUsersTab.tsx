'use client';

import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Briefcase } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminUsersTab() {
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CLIENT' | 'FREELANCER' | 'ADMIN'>('ALL');
  const [directProfiles, setDirectProfiles] = useState<any[]>([]);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('profiles').select('*');
        if (!error && data && Array.isArray(data)) {
          setDirectProfiles(data);
        }
      } catch (e) {}
    }
    fetchProfiles();
  }, []);

  const { data, isLoading } = trpc.admin.users.getUsers.useQuery({
    limit: 50,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    role: roleFilter,
  });

  const users = useMemo(() => {
    let list: any[] = [];
    if (data && Array.isArray(data.users) && data.users.length > 0) {
      list = data.users;
    } else if (directProfiles.length > 0) {
      list = directProfiles.map((p) => {
        const role = (p.role || 'CLIENT').toUpperCase();
        return {
          id: p.id,
          email: p.email || 'No email',
          role,
          isVerified: true,
          subscriptionPlan: p.subscriptionPlan && !p.subscriptionPlan.toUpperCase().includes('FREE') && !p.subscriptionPlan.toUpperCase().includes('STARTER') ? p.subscriptionPlan : (role === 'CLIENT' ? 'BUSINESS' : 'PRO'),
        };
      });
    }

    if (roleFilter !== 'ALL') {
      list = list.filter((u) => {
        const r = (u.role || 'CLIENT').toUpperCase();
        if (roleFilter === 'CLIENT') return r === 'CLIENT' || r === 'BUYER';
        if (roleFilter === 'FREELANCER') return r === 'FREELANCER' || r === 'ARTIST' || r === 'CREATOR';
        return r === roleFilter;
      });
    }

    return list;
  }, [data, directProfiles, roleFilter]);

  if (isLoading && users.length === 0) return <div className="text-white p-4">Loading users...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        {['ALL', 'CLIENT', 'FREELANCER', 'ADMIN'].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r as any)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${roleFilter === r ? 'bg-primary text-white' : 'bg-white/10 text-slate-300'}`}
          >
            {r === 'CLIENT' ? 'BUYERS' : r === 'FREELANCER' ? 'ARTISTS' : r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <div key={user.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <span className="text-white font-medium truncate" title={user.email || 'No email'}>
                  {user.email}
                </span>
              </div>
              <Badge className={
                user.role === 'CLIENT' ? 'bg-blue-500/20 text-blue-300' :
                user.role === 'FREELANCER' ? 'bg-green-500/20 text-green-300' :
                'bg-purple-500/20 text-purple-300'
              }>
                {user.role === 'CLIENT' ? 'BUYER' : user.role === 'FREELANCER' ? 'ARTIST' : 'ADMIN'}
              </Badge>
            </div>
            
            <div className="text-xs text-slate-400 mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3" />
                Status: {user.isVerified ? 'Verified' : 'Unverified'}
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-3 w-3" />
                Plan: {user.subscriptionPlan && !user.subscriptionPlan.toUpperCase().includes('FREE') && !user.subscriptionPlan.toUpperCase().includes('STARTER') ? user.subscriptionPlan.replace('FREELANCER_', '').replace('CLIENT_', '') : 'PRO'}
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-8">
            No users found.
          </div>
        )}
      </div>
    </div>
  );
}
