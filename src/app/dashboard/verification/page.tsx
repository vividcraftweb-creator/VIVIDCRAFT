import { redirect } from 'next/navigation';

export default function DashboardVerificationRedirect() {
  redirect('/dashboard?tab=verification');
}
