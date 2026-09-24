'use client';
import React, { useState, useEffect, useMemo, startTransition } from 'react';
import Link from 'next/link';
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
  UploadCloud,
  Image as ImageIcon,
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
  { name: 'Home', href: '/' },
  { name: 'Gallery', href: '/gallery' },
  { name: 'Discover Artists', href: '/artists' },
  { name: 'How It Works', href: '/how-it-works' },
  { name: 'Bidding', href: '/bidding' },
];

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { visible } = useScrollDirection(10);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const toggleMobileMenu = () => {
    startTransition(() => {
      setIsMobileMenuOpen((prev) => !prev);
    });
  };

  const closeMobileMenu = () => {
    startTransition(() => {
      setIsMobileMenuOpen(false);
    });
  };

  useEffect(() => {
    setIsMounted(true);

    // Check for mock admin session
    if (typeof window !== 'undefined') {
      const localUserStr = localStorage.getItem('user');
      if (localUserStr) {
        try {
          const parsed = JSON.parse(localUserStr);
          const parsedEmail = (parsed?.email || '').toLowerCase().trim();
          if (parsed?.role === 'admin' || parsedEmail === 'vividcraftweb@gmail.com' || parsedEmail === 'cinnamongallerysocial@gmail.com') {
            setUser({
              id: 'admin-vividcraft-default-id',
              email: parsedEmail || 'vividcraftweb@gmail.com',
              user_metadata: { role: 'ADMIN', name: 'Cinnamon Gallery Admin' },
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
      const userEmail = (user.email || '').toLowerCase().trim();
      const isAdminEmail = userEmail === 'vividcraftweb@gmail.com' || userEmail === 'cinnamongallerysocial@gmail.com';
      const metaRole = (user?.user_metadata?.role || '').toString().trim().toUpperCase();
      // Normalize artist/creator/seller variants to FREELANCER
      const normalized = isAdminEmail ? 'ADMIN' : ['ARTIST', 'CREATOR', 'SELLER'].includes(metaRole) ? 'FREELANCER' : metaRole;
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
        const userEmail = (session.user.email || '').toLowerCase().trim();
        const isAdminEmail = userEmail === 'vividcraftweb@gmail.com' || userEmail === 'cinnamongallerysocial@gmail.com';
        const metaRole = (session.user?.user_metadata?.role || '').toString().trim().toUpperCase();
        const normalized = isAdminEmail ? 'ADMIN' : ['ARTIST', 'CREATOR', 'SELLER'].includes(metaRole) ? 'FREELANCER' : metaRole;
        setUserRole(normalized || null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const hasUser = !!user;
  const isPublicProfilePage =
    Boolean(pathname?.startsWith('/artist') ||
    pathname?.startsWith('/freelancers/') ||
    (pathname?.startsWith('/profile/') && !pathname?.startsWith('/profile/edit')));

  // Fetch profile data for avatar and name (disabled on public artist profile pages to prevent unauthenticated batch crashes)
  const { data: profile, isLoading: isProfileLoading } = trpc.profiles.getMyProfile.useQuery({}, {
    enabled: hasUser && userRole !== 'ADMIN' && !isPublicProfilePage,
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
  const isAdmin = hasUser && (effectiveRole === 'ADMIN' || (user?.email && ['vividcraftweb@gmail.com', 'cinnamongallerysocial@gmail.com'].includes(user.email.toLowerCase().trim())));
  const isBuyerOrClient = hasUser && !isArtistOrCreator && !isAdmin;

  // Calculate avatar & initials - memoized to prevent flashing
  const { userFullName, userInitials, avatarSrc } = useMemo(() => {
    if (userRole === 'ADMIN') {
      return { userFullName: 'Admin', userInitials: 'AD', avatarSrc: undefined };
    }
    const fName = profile?.firstName || (profile as any)?.first_name || '';
    const lName = profile?.lastName || (profile as any)?.last_name || '';
    const fullName = (!isProfileLoading && (fName || lName))
      ? `${fName} ${lName}`.trim()
      : (profile as any)?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

    const rawPic =
      profile?.profilePicture ||
      (profile as any)?.avatar_url ||
      (profile as any)?.profile_picture ||
      (profile as any)?.avatar ||
      (profile as any)?.image;

    const userMetaPic =
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      (user as any)?.image ||
      undefined;

    let avatarUrl: string | undefined = undefined;
    if (rawPic) {
      avatarUrl = getProfilePictureUrl(profile?.userId || (profile as any)?.id || user?.id, rawPic);
    }
    if (!avatarUrl && userMetaPic) {
      avatarUrl = userMetaPic;
    }

    let initials = 'U';
    if (fullName && fullName !== 'User') {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
        initials = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      } else if (parts[0]) {
        initials = parts[0].slice(0, 2).toUpperCase();
      }
    }

    return { userFullName: fullName, userInitials: initials, avatarSrc: avatarUrl };
  }, [isProfileLoading, profile, user, userRole]);

  const isActive = (href: string) => pathname === href;

  const handleSignOut = async (e?: React.MouseEvent) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      document.cookie = 'is_admin=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'mock_admin_session=; path=/; max-age=0; SameSite=Lax';
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error('Sign out error', err);
    } finally {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      window.location.href = '/login';
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
        className={`fixed left-0 right-0 z-40 px-4 pt-6 sm:px-6 transition-transform duration-300 ease-in-out ${
          visible ? 'top-0 translate-y-0' : '-top-32 -translate-y-full'
        }`}
      >
        <nav className="mx-auto max-w-6xl rounded-full border border-slate-200/60 dark:border-white/20 bg-white/70 dark:bg-black/40 backdrop-blur-xl px-6 shadow-lg dark:shadow-none transition-all duration-300">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-bold flex items-center gap-3 group">
              <img src="/cinnamon-gallery-logo.png" alt="Cinnamon Gallery Logo" className="w-9 h-9 object-contain" />
              <span className="tracking-tight text-slate-900 dark:text-white">
                Cinnamon Gallery
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
              {/* Admin Moderation Active Badge (Header) */}
              {isAdmin && (
                <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 dark:text-amber-300 text-xs font-semibold shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Moderation</span>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
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
                            <AvatarFallback className="bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold">
                              {userInitials || <UserIcon className="h-4 w-4 text-slate-700 dark:text-slate-200" />}
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
                              className="gap-3 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-amber-600 dark:text-amber-400 font-medium"
                              onClick={() => router.push('/admin')}
                            >
                              <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              <span>Admin Panel</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-3 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 text-amber-600 dark:text-amber-400 font-medium"
                              onClick={() => router.push('/gallery?upload=true')}
                            >
                              <UploadCloud className="h-4 w-4 text-amber-500" />
                              <span>Upload Artwork</span>
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
                              onClick={() => router.push('/gallery')}
                            >
                              <ImageIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                              <span>Gallery</span>
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
                    className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-full"
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
                  onClick={closeMobileMenu}
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
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold mb-2">
                        <Shield className="h-4 w-4 text-amber-400" />
                        <span>Admin Moderation Active</span>
                      </div>
                      <Link
                        href="/admin"
                        onClick={closeMobileMenu}
                        className="flex items-center gap-3 text-xl font-medium text-amber-400 hover:text-amber-300 transition-all hover:translate-x-2"
                      >
                        <Shield className="h-5 w-5" />
                        <span>Admin Panel</span>
                      </Link>
                      <Link
                        href="/gallery?upload=true"
                        onClick={closeMobileMenu}
                        className="flex items-center gap-3 text-xl font-medium text-amber-400 hover:text-amber-300 transition-all hover:translate-x-2"
                      >
                        <UploadCloud className="h-5 w-5" />
                        <span>Upload Artwork</span>
                      </Link>
                      <Link
                        href="/dashboard"
                        onClick={closeMobileMenu}
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
                        onClick={closeMobileMenu}
                        className="flex items-center gap-3 text-xl font-medium text-white/70 hover:text-white transition-all hover:translate-x-2"
                      >
                        <Briefcase className="h-5 w-5" />
                        <span>Dashboard</span>
                      </Link>
                      <Link
                        href="/profile"
                        onClick={closeMobileMenu}
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
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 text-xl font-medium text-white/70 hover:text-white transition-all hover:translate-x-2"
                    >
                      <UserIcon className="h-5 w-5" />
                      <span>Profile</span>
                    </Link>
                  )}

                  <Link
                    href="/notifications"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 text-xl font-medium text-white/70 hover:text-white transition-all hover:translate-x-2"
                  >
                    <Bell className="h-5 w-5" />
                    <span>Notifications</span>
                  </Link>
                </div>


                {/* Sign Out */}
                <button
                  onClick={() => {
                    closeMobileMenu();
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
                  onClick={closeMobileMenu}
                  className="block w-full text-center py-3 text-lg font-medium text-white/70 hover:text-white border border-white/20 rounded-full hover:bg-white/10 transition-all hover:scale-105"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={closeMobileMenu}
                  className="block w-full text-center py-3 text-lg font-medium bg-white text-gray-900 hover:bg-white/90 rounded-full transition-all hover:scale-105"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Admin Moderation Active Indicator */}
      {isAdmin && (
        <div className="fixed bottom-5 right-5 z-40 hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-2xl backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>Admin Moderation Active</span>
        </div>
      )}
    </>
  );
};



export default Header;
