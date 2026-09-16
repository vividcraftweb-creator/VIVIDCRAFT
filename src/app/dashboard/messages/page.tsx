import { Suspense } from 'react';
import MessagesClient from '@/app/messages/MessagesClient';

export default function DashboardMessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <p>Loading messages...</p>
      </div>
    }>
      <MessagesClient />
    </Suspense>
  );
}
