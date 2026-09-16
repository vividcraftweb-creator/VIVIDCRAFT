'use client';

import React from 'react';
import type { AppSession } from '@/types/session';

interface SidebarProps {
  profile?: any;
  user?: any;
  session?: AppSession | null;
}

export default function Sidebar({ profile, user, session }: SidebarProps) {
  const displayRole = profile?.role || user?.user_metadata?.role || session?.user?.role || 'CLIENT';

  return (
    <div className="p-4 border-b border-white/10">
      <div className="flex items-center space-x-3">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-slate-400 capitalize">{displayRole.toLowerCase()}</span>
        </div>
      </div>
    </div>
  );
}

export { Sidebar };
