import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import AuditLogsPageClient from './AuditLogsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Audit Logs',
  description: 'View system audit logs and activity history.',
});

export default function AuditLogsPage() {
  try {
    return <AuditLogsPageClient />;
  } catch (error) {
    console.error('Error rendering AuditLogsPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-slate-400">Loading audit logs...</p>
      </div>
    );
  }
}
