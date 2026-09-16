'use client';

import { Suspense } from 'react';
import Dashboard from './Dashboard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardLayout';
import type { AppSession } from '@/types/session';

export default function DashboardWrapper({ session }: { session: AppSession }) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard session={session} />
    </Suspense>
  );
}
