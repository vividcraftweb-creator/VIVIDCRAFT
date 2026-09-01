'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import type { AppSession } from '@/types/session';

export default function ConditionalLayout({ children }: { children: React.ReactNode; session?: AppSession | null }) {
  const pathname = usePathname();

  // Don't show header/footer for dashboard routes, admin routes, auth routes, profile-editor, and job creation
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isAdminRoute = pathname.startsWith('/admin');
  const isAuthRoute = pathname.startsWith('/auth/');
  const isProfileEditorRoute = pathname.startsWith('/profile-editor');
  const isJobCreateRoute = pathname.startsWith('/jobs/create');
  const showHeaderFooter = !isDashboardRoute && !isAdminRoute && !isAuthRoute && !isProfileEditorRoute && !isJobCreateRoute;

  if (showHeaderFooter) {
    return (
      <>
        <Header />
        <main className="pt-28">
          {children}
        </main>
        <Footer />
      </>
    );
  }

  // For dashboard and auth routes, let them handle their own layout
  return <>{children}</>;
}

