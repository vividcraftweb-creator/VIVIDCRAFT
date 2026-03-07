import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import AuditLogsPageClient from './AuditLogsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Audit Logs',
  description: 'View system audit logs and activity history.',
});

export default function AuditLogsPage() {
  return <AuditLogsPageClient />;
}
