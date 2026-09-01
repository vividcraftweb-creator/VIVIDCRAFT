'use client';

import Dashboard from './Dashboard';
import type { AppSession } from '@/types/session';

export default function DashboardWrapper({ session }: { session: AppSession }) {
  return <Dashboard session={session} />;
}
