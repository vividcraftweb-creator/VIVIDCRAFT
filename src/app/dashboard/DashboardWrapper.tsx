'use client';

import { Suspense } from 'react';
import Dashboard from './Dashboard';
import type { AppSession } from '@/types/session';

export default function DashboardWrapper({ session }: { session: AppSession }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    }>
      <Dashboard session={session} />
    </Suspense>
  );
}
