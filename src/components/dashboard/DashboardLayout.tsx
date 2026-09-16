'use client';

import React from 'react';

export function DashboardSkeleton() {
  return (
    <div className="h-screen bg-slate-950 dark flex overflow-hidden text-slate-100 animate-pulse">
      {/* Sidebar Skeleton */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col border-r border-slate-800 bg-slate-900/95 p-4 space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 h-12 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-slate-800" />
          <div className="h-5 w-24 rounded bg-slate-800" />
        </div>

        {/* User Card */}
        <div className="p-3 bg-slate-800/50 rounded-xl space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-24 rounded bg-slate-800" />
              <div className="h-3 w-16 rounded bg-slate-800/70" />
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <div className="space-y-2 flex-1 pt-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-slate-800/60" />
          ))}
        </div>

        {/* Sign out */}
        <div className="h-10 rounded-xl bg-slate-800/40" />
      </div>

      {/* Main Content Area Skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Skeleton */}
        <div className="h-16 border-b border-slate-800 bg-slate-900/95 px-6 flex items-center justify-between">
          <div className="h-6 w-36 rounded bg-slate-800" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800" />
            <div className="w-9 h-9 rounded-full bg-slate-800" />
          </div>
        </div>

        {/* Page Content Skeleton */}
        <div className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto overflow-y-auto">
          <div className="space-y-2">
            <div className="h-8 w-52 rounded bg-slate-800" />
            <div className="h-4 w-72 rounded bg-slate-800/60" />
          </div>

          {/* Cards Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 space-y-3">
                <div className="h-4 w-20 rounded bg-slate-800" />
                <div className="h-8 w-16 rounded bg-slate-800" />
              </div>
            ))}
          </div>

          {/* Main section placeholder */}
          <div className="h-96 rounded-2xl bg-slate-900/80 border border-slate-800/80 p-6 space-y-4">
            <div className="h-6 w-44 rounded bg-slate-800" />
            <div className="h-64 rounded-xl bg-slate-800/40" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
  isLoading,
}: {
  children: React.ReactNode;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return <>{children}</>;
}
