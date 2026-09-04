'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import { ThemeSwitcher } from '@/components/theme-switcher';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  User as UserIcon,
  Briefcase,
  LogOut,
  Zap,
  MessageSquare,
  FileText,
  CreditCard,
  Bell,
  Shield,
  ShoppingBag,
} from 'lucide-react';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getProfilePictureUrl } from '@/lib/profile-helpers';
import { useScrollDirection } from '@/hooks/useScrollDirection';

const getNavigation = () => [
  { name: 'Explore Art', href: '/jobs' },
  { name: 'Discover Artists', href: '/freelancers' },
  { name: 'How It Works', href: '/how-it-works' },
];

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { visible } = useScrollDirection(10);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);

    // Check for mock admin session
    if (typeof window !== 'undefined') {
      const localUserStr = localStorage.getItem('user');
      if (localUserStr) {
        try {
          const parsed = JSON.parse(localUserStr);
          if (parsed?.role === 'admin' || parsed?.email === 'vividcraftweb@gmail.com') {
            setUser({
              id: 'admin-vividcraft-default-id',
              email: 'vividcraftweb@gmail.com',
              user_metadata: { role: 'ADMIN', name: 'Vivid Craft Admin' },
            } as any);
            setUserRole('ADMIN');
          }
        } catch {}
      }
    }

    // Get initial user from supabase
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        setUser(null);
        setUserRole(null);
        return;
      }
      setUser(user);
      const metaRole = (user?.user_metadata?.role || '').toString().trim().toUpperCase();
      // Normalize artist/creator/seller variants to FREELANCER
      const normalized = ['ARTIST', 'CREATOR', 'SELLER'].includes(metaRole) ? 'FREELANCER' : metaRole;
      setUserRole(normalized || null);
    }).catch(() => {
      setUser(null);
      setUserRole(null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setUserRole(null);
      } else {
        setUser(session.user);
        const metaRole = (session.user?.user_metadata?.role || '').toString().trim().toUpperCase();
        const normalized = ['ARTIST', 'CREATOR', 'SELLER'].includes(metaRole) ? 'FREELANCER' : metaRole;
        setUserRole(normalized || null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const hasUser = !!user;

  // Fetch profile data for avatar and name
  const { data: profile, isLoading: isProfileLoading } = trpc.profiles.getMyProfile.useQuery(undefined, {
    enabled: hasUser && userRole !== 'ADMIN',
    retry: false,
  });

  // Check the logged-in user's role from user.role, user_metadata.role, or profile.role
  const effectiveRole = useMemo(() => {
    const rawRole = (
      userRole ||
      (profile as any)?.role ||
      user?.user_metadata?.role ||
      (user as any)?.role ||
      ''
    ).toString().trim().toUpperCase();

    return rawRole;
  }, [userRole, profile, user]);

  const isArtistOrCreator = hasUser && (effectiveRole === 'FREELANCER' || effectiveRole === 'ARTIST' || effectiveRole === 'CREATOR');
  const isAdmin = hasUser && effectiveRole === 'ADMIN';
  const isBuyerOrClient = hasUser && !isArtistOrCreator && !isAdmin;

  // Calculate avatar - memoized to prevent flashing
  const { userFullName, avatarSrc } = useMemo(() => {
    if (userRole === 'ADMIN') {
      return { userFullName: 'Admin', avatarSrc: undefined };
    }
    const fullName = (!isProfileLoading && profile?.firstName && profile?.lastName)
      ? `${profile.firstName} ${profile.lastName}`
      : user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

    const avatarUrl = (!isProfileLoading)
      ? getProfilePictureUrl(profile?.userId, profile?.profilePicture) || user?.user_metadata?.avatar_url || undefined
      : user?.user_metadata?.avatar_url || undefined;

    return { userFullName: fullName, avatarSrc: avatarUrl };
  }, [isProfileLoading, profile?.firstName, profile?.lastName, profile?.profilePicture, profile?.userId, user?.user_metadata?.name, user?.user_metadata?.avatar_url, user?.email, userRole]);

  const isActive = (href: string) => pathname === href;

  const handleSignOut = async (e?: React.MouseEvent) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      document.cookie = 'is_admin=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'mock_admin_session=; path=/; max-age=0; SameSite=Lax';
      localStorage.removeItem('user');
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore sign out errors
    } finally {
      setUser(null);
      setUserRole(null);
      router.push('/');
      router.refresh();
    }
  };

  const handleDashboardClick = () => {
    router.push('/dashboard');
  };

  const navigation = getNavigation();

  return (
    <>
      {/* Header - Visible on all screen sizes */}
      <header
        className={`fixed left-0 right-0 z-50 px-4 pt-6 sm:px-6 transition-transform duration-300 ease-in-out ${
          visible ? 'top-0 translate-y-0' : '-top-32 -translate-y-full'
        }`}
      >
        <nav className="mx-auto max-w-6xl rounded-full border border-slate-200/60 dark:border-white/20 bg-white/70 dark:bg-black/40 backdrop-blur-xl px-6 shadow-lg dark:shadow-none transition-all duration-300">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 group">
              {/* Artistic paint-swirl V emblem */}
              <svg
                className="w-9 h-9 group-hover:scale-110 transition-transform duration-300"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="logoGrad1" x1="0" y1="0" x2="48" y2="48">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="50%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                  <linearGradient id="logoGrad2" x1="48" y1="0" x2="0" y2="48">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                {/* Outer swirl */}
                <path
                  d="M24 4C13 4 6 14 10 24C14 34 20 38 24 44C28 38 34 34 38 24C42 14 35 4 24 4Z"
                  fill="url(#logoGrad1)"
                  fillOpacity="0.9"
                />
                {/* Inner V brushstroke */}
                <path
                  d="M16 14L24 34L32 14"
                  stroke="white"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                {/* Paint splash dot */}
                <circle cx="36" cy="12" r="3" fill="url(#logoGrad2)" />
              </svg>
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                Vivid Art
              </span>
            </Link>

            {/* Navigation - Hidden on mobile */}
            <div className="hidden lg:flex items-center gap-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center justify-center text-slate-700 dark:text-white"
                aria-label="Toggle mobile menu"
              >
                <div className="relative w-5 h-4 flex flex-col justify-between">
                  <span className={`w-full h-0.5 bg-slate-700 dark:bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                  <span className={`w-full h-0.5 bg-slate-700 dark:bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
                  <span className={`w-full h-0.5 bg-slate-700 dark:bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
                </div>
              </button>

              {user ? (
                <>
                  {/* Theme and Language Toggles (Desktop) */}
                  <div className="hidden lg:flex items-center gap-2">
                    <ThemeSwitcher />
                    <LanguageSwitcher />
                  </div>

                  {/* Notification Dropdown (Desktop) */}
                  <div className="hidden lg:block">
                    <NotificationDropdown />
                  </div>

                  {/* User Menu (Desktop) */}
                  <div className="hidden lg:block">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-9 w-9 rounded-full p-0 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-200"
                        >
                          <Avatar className="h-8 w-8 border border-slate-200 dark:border-white/20">
                            <AvatarImage src={avatarSrc} alt={userFullName} />
                            <AvatarFallback className="bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                              <UserIcon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg text-slate-800 dark:text-white"
                        align="end"
                        sideOffset={8}
                      >
                        {isAdmin && (
                          <>
                            <DropdownMenuItem
                              className="gap-3 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-purple-600 dark:text-purple-400 font-medium"
                              onClick={() => router.push('/admin')}
                            >
                              <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              <span>Admin Panel</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-3 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white"
                              onClick={() => router.push('/dashboard')}
                            >
                              <Briefcase className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                              <span>Dashboard</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-3 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white"
                              onClick={() => router.push('/dashboard?tab=messages')}
                            >
                              <MessageSquare className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                              <span>Messages</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-3 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white"
                              onClick={() => router.push('/profile')}
                            >
                              <UserIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                              <span>Profile</span>
                            </DropdownMenuItem>
                          </>
                        )}

                        {isArtistOrCreator && (
                          <>
                            <DropdownMenuItem
                              className="gap-3 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white"
                              onClick={() => router.push('/dashboard')}
                            >
                              <Briefcase className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                              <span>Dashboard</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-3 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white"
                              onClick={() => router.push('/dashboard?tab=messages')}
                            >
                              <MessageSquare className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                              <span>Messages</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-3 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white"
                              onClick={() => router.push('/dashboard?tab=proposals')}
                            >
                              <FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                              <span>My Proposals</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-3 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white"
                              onClick={() => router.push('/dashboard?tab=subscription')}
                            >
                              <CreditCard className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                              <span>Subscription</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-3 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white"
                              onClick={() => router.push('/profile')}
                            >
                              <UserIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                              <span>Profile</span>
                            </DropdownMenuItem>
                          </>
                        )}

                        {isBuyerOrClient && (
                          <DropdownMenuItem
                            className="gap-3 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white"
                            onClick={() => router.push('/profile')}
                          >
                            <UserIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                            <span>Profile</span>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/20" />
                        <DropdownMenuItem
                          className="gap-3 py-3 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
                          onClick={handleSignOut}
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              ) : (
                <div className="hidden lg:flex items-center gap-3">
                  <ThemeSwitcher />
                  <LanguageSwitcher />
                  <Button
                    asChild
                    variant="ghost"
                    className="text-sm font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <Link href="/auth/signin">
                      Sign In
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="text-sm font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white/90 transition-colors rounded-full"
                  >
                    <Link href="/auth/signup">
                      Get Started
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex flex-col h-full pt-36 px-6">
            {/* Navigation Links */}
            <div className="space-y-4 mb-8">
              {navigation.map((item, index) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block text-2xl font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'text-white'
                      : 'text-white/70 hover:text-white hover:translate-x-2'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 mb-8 text-white">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>

            {user ? (
              <>
                {/* User Menu Items */}
                <div className="space-y-4 mb-8 border-t border-white/20 pt-8">
                  {isAdmin && (
                    <>
                      <Link
                        href="/admin"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 text-xl font-medium text-purple-400 hover:text-purple-300 transition-all hover:translate-x-2"
                      >
                        <Shield className="h-5 w-5" />
                        <span>Admin Panel</span>
                      </Link>
                      <Link
                        href="/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 text-xl font-medium text-white/70 hover:text-white transition-all hover:translate-x-2"
                      >
                        <Briefcase className="h-5 w-5" />
                        <span>Dashboard</span>
                      </Link>
                    </>
                  )}

                  {isArtistOrCreator && (
                    <>
                      <Link
                        href="/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 text-xl font-medium text-white/70 hover:text-white transition-all hover:translate-x-2"
                      >
                        <Briefcase className="h-5 w-5" />
                        <span>Dashboard</span>
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 text-xl font-medium text-white/70 hover:text-white transition-all hover:translate-x-2"
                      >
                        <UserIcon className="h-5 w-5" />
                        <span>Profile</span>
                      </Link>
                    </>
                  )}

                  {isBuyerOrClient && (
                    <Link
                      href="/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 text-xl font-medium text-white/70 hover:text-white transition-all hover:translate-x-2"
                    >
                      <UserIcon className="h-5 w-5" />
                      <span>Profile</span>
                    </Link>
                  )}

                  <Link
                    href="/notifications"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 text-xl font-medium text-white/70 hover:text-white transition-all hover:translate-x-2"
                  >
                    <Bell className="h-5 w-5" />
                    <span>Notifications</span>
                  </Link>
                </div>


                {/* Sign Out */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-3 text-xl font-medium text-red-400 hover:text-red-300 transition-all hover:translate-x-2"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <Link
                  href="/auth/signin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center py-3 text-lg font-medium text-white/70 hover:text-white border border-white/20 rounded-full hover:bg-white/10 transition-all hover:scale-105"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center py-3 text-lg font-medium bg-white text-gray-900 hover:bg-white/90 rounded-full transition-all hover:scale-105"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};



export default Header;
