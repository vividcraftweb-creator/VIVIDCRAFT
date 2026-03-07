'use client';

import dynamic from 'next/dynamic';
import type { AppSession } from '@/types/session';

const Dashboard = dynamic(() => import('./Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white">Loading dashboard...</div>
    </div>
  )
});

export default function DashboardWrapper({ session }: { session: AppSession }) {
  return <Dashboard session={session} />;
}
