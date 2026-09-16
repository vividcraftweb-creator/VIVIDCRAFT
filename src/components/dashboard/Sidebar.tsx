'use client';

import React from 'react';
import type { AppSession } from '@/types/session';

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

  return (
    <div className="p-4 border-b border-white/10">
      <div className="flex items-center space-x-3">
        <div className="flex-1 min-w-0">
          {email && (
            <p className="text-xs text-gray-400 truncate mb-1">
              {email}
            </p>
          )}
          <span className="text-xs text-slate-400 capitalize">
            {displayRole.toLowerCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

export { Sidebar };
