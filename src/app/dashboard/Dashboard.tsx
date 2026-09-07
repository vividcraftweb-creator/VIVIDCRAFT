'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import {
  Home,
  Briefcase,
  MessageSquare,
  User,
  Settings,
  Menu,
  X,
  Plus,
  LogOut,
  CreditCard,
  FileText,
  Shield,
  Users,
  Key,
  Webhook,
  FolderOpen,
  Headphones,
  Crown,
  UserCheck,
  BarChart3,
  ArrowLeft,
  Image as ImageIcon,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { AppSession } from '@/types/session';
import { getProfilePictureUrl } from '@/lib/profile-helpers';

import ArtistDashboard from '@/components/dashboard/ArtistDashboard';
const SubscriptionStatusBanner = dynamic(() => import('@/components/dashboard/SubscriptionStatusBanner'), {
  ssr: false,
});
const GalleryView = dynamic(() => import('@/components/dashboard/GalleryView'), {
  loading: () => <div className="text-white p-8 animate-pulse">Loading gallery...</div>,
  ssr: false,
});

type DashboardView =
  | 'dashboard'
  | 'messages'
  | 'proposals'
  | 'profile'
  | 'verification'
  | 'settings'
  | 'subscription'
  | 'gallery';

const DASHBOARD_VIEW_SET = new Set<DashboardView>([
  'dashboard',
  'messages',
  'proposals',
  'profile',
  'verification',
  'settings',
  'subscription',
  'gallery',
]);

const isDashboardView = (value: string | null): value is DashboardView =>
  !!value && DASHBOARD_VIEW_SET.has(value as DashboardView);

export default function Dashboard({ session }: { session: AppSession }) {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<DashboardView>('dashboard');
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Fetch profile data to get updated name & role
  const { data: profile } = trpc.profiles.getMyProfile.useQuery({}, {
    enabled: !!session,
    retry: false,
  });

  const profileRole = (profile?.role || '').toString().trim().toUpperCase();
  const sessionRole = (session?.user?.role || '').toString().trim().toUpperCase();
  const isAdminRole = profileRole === 'ADMIN' || sessionRole === 'ADMIN';

  // Force ARTIST as the default fallback profile state regardless of user role (e.g. COLLECTOR / CLIENT)
  const role: 'ARTIST' | 'ADMIN' = isAdminRole ? 'ADMIN' : 'ARTIST';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect admins to admin panel immediately
  useEffect(() => {
    if (mounted && role === 'ADMIN') {
      router.push('/admin');
    }
  }, [mounted, role, router]);

  // Fetch notifications with session guarding
  const { data: notificationsData } = trpc.notifications.getNotifications.useQuery({}, {
    enabled: !!session,
    retry: false,
  });

  const fName = profile?.firstName || (profile as any)?.first_name || '';
  const lName = profile?.lastName || (profile as any)?.last_name || '';
  const userFullName = (fName || lName)
    ? `${fName} ${lName}`.trim()
    : (profile as any)?.full_name || session.user?.name || 'User';

  const userFirstName = fName || (session.user?.name ? session.user.name.split(' ')[0] : 'User') || 'User';

  const rawAvatarPic =
    profile?.profilePicture ||
    (profile as any)?.avatar_url ||
    (profile as any)?.profile_picture ||
    (profile as any)?.avatar ||
    (profile as any)?.image;

  const userMetaPic =
    (session.user as any)?.user_metadata?.avatar_url ||
    (session.user as any)?.user_metadata?.picture ||
    session.user?.image ||
    undefined;

  const avatarSrc = (rawAvatarPic ? getProfilePictureUrl(profile?.userId || (profile as any)?.id || session.user?.id, rawAvatarPic) : undefined)
    || userMetaPic
    || undefined;

  const userInitials = (() => {
    if (!userFullName || userFullName === 'User') return 'U';
    const parts = userFullName.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return userFullName.slice(0, 2).toUpperCase();
  })();

  // Fetch user plan permissions
  const { data: planSummary } = trpc.user.getPlanFeatures.useQuery(undefined, {
    enabled: !!session?.user,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });

  const planPermissions = planSummary?.permissions;

  // Define navigation items based on role
  const getNavigationItems = () => {
    if (role === 'ADMIN') {
      return [
        { name: 'Dashboard', icon: Home, href: '/dashboard', view: 'dashboard' },
        { name: 'Admin Panel', icon: Shield, href: '/admin' },
        { name: 'User Management', icon: Users, href: '/admin/users' },
        { name: 'Job Management', icon: Briefcase, href: '/admin/jobs' },
        { name: 'Verifications', icon: Shield, href: '/admin/verifications' },
        { name: 'Messages', icon: MessageSquare, href: '/messages' },
        { name: 'Profile', icon: User, href: '/profile/edit' },
        { name: 'Settings', icon: Settings, href: '/settings' },
        { name: 'Sign Out', icon: LogOut, action: 'signout' },
      ];
    }

    return [
      { name: 'Back to Homepage', icon: ArrowLeft, href: '/' },
      { name: 'Dashboard', icon: Home, href: '/dashboard', view: 'dashboard' },
      { name: 'Gallery', icon: ImageIcon, href: '/dashboard?tab=gallery', view: 'gallery' },
      { name: 'Messages', icon: MessageSquare, href: '/dashboard?tab=messages', view: 'messages' },
      { name: 'Browse Commissions', icon: Palette, href: '/jobs' },
      { name: 'My Commissions & Proposals', icon: FileText, href: '/dashboard?tab=proposals', view: 'proposals' },
      { name: 'Subscription', icon: CreditCard, href: '/dashboard?tab=subscription', view: 'subscription' },
      { name: 'Profile', icon: User, href: '/dashboard?tab=profile', view: 'profile' },
      { name: 'Verification', icon: Shield, href: '/dashboard?tab=verification', view: 'verification' },
      { name: 'Settings', icon: Settings, href: '/dashboard?tab=settings', view: 'settings' },
      { name: 'Sign Out', icon: LogOut, action: 'signout' },
    ];
  };

  const navigationItems = getNavigationItems();

  useEffect(() => {
    const tabParam = searchParams.get('tab');

    if (isDashboardView(tabParam)) {
      setCurrentView((prev) => (prev === tabParam ? prev : tabParam));
    } else {
      setCurrentView((prev) => (prev === 'dashboard' ? prev : 'dashboard'));
    }
  }, [searchParams]);

  const navigateToView = (view: DashboardView) => {
    setCurrentView((prev) => (prev === view ? prev : view));

    const params = new URLSearchParams(searchParams.toString());

    if (view === 'dashboard') {
      params.delete('tab');
    } else {
      params.set('tab', view);
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    const currentHref = currentQuery ? `${pathname}?${currentQuery}` : pathname;

    if (nextHref !== currentHref) {
      router.push(nextHref);
    }

    setSidebarOpen(false);
  };

  const handleSignOut = async (e?: React.MouseEvent) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      document.cookie = 'mock_admin_session=; path=/; max-age=0; SameSite=Lax';
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      window.location.href = '/login';
    }
  };

  const renderDashboardContent = () => {
    return <ArtistDashboard view={currentView} />;
  };

  const getRoleColor = () => {
    if (role === 'ADMIN') {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
    return 'bg-green-500/20 text-green-300 border-green-500/30';
  };

  return (
    <div className="h-screen bg-gray-950 flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col backdrop-blur-xl bg-gray-900/95 border-r border-white/10">
          {/* Logo/Brand */}
          <div className="flex h-16 shrink-0 items-center px-6 border-b border-white/10">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <svg
                className="w-8 h-8"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="dashboardLogoGrad1" x1="0" y1="0" x2="48" y2="48">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="50%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                  <linearGradient id="dashboardLogoGrad2" x1="48" y1="0" x2="0" y2="48">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <path
                  d="M24 4C13 4 6 14 10 24C14 34 20 38 24 44C28 38 34 34 38 24C42 14 35 4 24 4Z"
                  fill="url(#dashboardLogoGrad1)"
                  fillOpacity="0.9"
                />
                <path
                  d="M16 14L24 34L32 14"
                  stroke="white"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <circle cx="36" cy="12" r="3" fill="url(#dashboardLogoGrad2)" />
              </svg>
              <span className="font-bold text-lg tracking-tight text-white">
                Vivid Art
              </span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden ml-auto text-white hover:bg-white/10 p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 border border-white/20">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback className="bg-purple-600/30 text-white font-bold text-xs">
                  {userInitials || <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {userFullName}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {session.user?.email}
                </p>
                <Badge className={`w-fit text-xs mt-1 ${getRoleColor()}`}>
                  {role === 'ADMIN' ? 'ADMIN' : 'ARTIST'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item): React.ReactElement => {
              const isActive = 'view' in item && item.view ? item.view === currentView : false;
              const isPremium = 'isPremium' in item && item.isPremium;

              if (item.href) {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      if ('view' in item && item.view) {
                        navigateToView(item.view as DashboardView);
                      }
                      setSidebarOpen(false);
                    }}
                    className={`flex items-center justify-between space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-500/20 text-white border border-blue-500/30'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </div>
                    {isPremium ? (
                      <Crown className="h-3 w-3 text-yellow-500" />
                    ) : null}
                  </Link>
                );
              }

              if ('action' in item && item.action === 'signout') {
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={(e) => handleSignOut(e)}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-red-400 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if ('view' in item && item.view) {
                      navigateToView(item.view as DashboardView);
                    }
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500/20 text-white border border-blue-500/30'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar for mobile */}
        <div className="lg:hidden">
          <div className="flex h-16 items-center gap-x-4 border-b border-white/10 bg-gray-900/95 px-4 shadow-sm sm:gap-x-6 sm:px-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="text-white hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-white">
                {role === 'ADMIN' ? 'Admin' : 'Artist'} Dashboard
              </h1>
            </div>
            <NotificationDropdown />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-950">
          <div className="p-4 sm:p-6">
            {/* Desktop header */}
            <div className="hidden lg:block mb-6 lg:mb-8 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {role === 'ADMIN' ? 'Admin' : 'Artist'} Dashboard
                  </h1>
                  <p className="text-gray-400 text-lg">
                    Welcome back, {userFirstName}
                  </p>
                </div>
                <NotificationDropdown />
          </div>
        </div>
            
            {/* Dashboard content */}
            <div className="max-w-7xl mx-auto">
              <SubscriptionStatusBanner />
              {renderDashboardContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
