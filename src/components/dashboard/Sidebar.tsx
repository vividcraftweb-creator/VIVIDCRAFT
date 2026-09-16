'use client';

import React from 'react';
import type { AppSession } from '@/types/session';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  profile?: any;
  user?: any;
  session?: AppSession | null;
  role?: string;
}

export default function Sidebar({ profile, user, session, role }: SidebarProps) {
  const rawRole =
    (profile as any)?.role ||
    (user as any)?.user_metadata?.role ||
    session?.user?.role ||
    role ||
    'CLIENT';

  const cleanRole = String(rawRole).trim().toUpperCase();
  const isClient = cleanRole === 'CLIENT' || cleanRole === 'BUYER' || cleanRole === 'COLLECTOR';
  const isAdmin = cleanRole === 'ADMIN';
  const displayRole = isAdmin ? 'Admin' : isClient ? 'Client' : 'Artist';
  const email = user?.email || session?.user?.email || '';

  const getRoleBadgeColor = () => {
    switch (cleanRole) {
      case 'ADMIN':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'CLIENT':
      case 'BUYER':
      case 'COLLECTOR':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
  };

  return (
    <div className="p-4 border-b border-white/10">
      <div className="flex items-center space-x-3">
        <div className="flex-1 min-w-0">
          {email && (
            <p className="text-xs text-gray-400 truncate mb-1.5">
              {email}
            </p>
          )}
          <Badge className={`w-fit text-xs ${getRoleBadgeColor()}`}>
            <span className="capitalize">{displayRole.toLowerCase()}</span>
          </Badge>
        </div>
      </div>
    </div>
  );
}

export { Sidebar };
