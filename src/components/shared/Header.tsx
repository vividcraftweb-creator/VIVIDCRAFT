'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
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
  { name: 'Find Work', href: '/jobs' },
  { name: 'Hire Freelancers', href: '/freelancers' },
  { name: 'How It Works', href: '/how-it-works' },
  { name: 'Pricing', href: '/pricing' },
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

    // Get initial user
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setUserRole(user?.user_metadata?.role || null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
      setUserRole(session?.user?.user_metadata?.role || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const hasUser = !!user;
  const isFreelancer = hasUser && userRole === 'FREELANCER';

  // Fetch current token status for freelancers
  const { data: tokenStatus } = trpc.user.getTokenStatus.useQuery(undefined, {
    enabled: isFreelancer,
    refetchInterval: isFreelancer ? 10000 : false,
  });

  // Fetch profile data for avatar and name
  const { data: profile, isLoading: isProfileLoading } = trpc.profiles.getMyProfile.useQuery(undefined, {
    enabled: hasUser,
  });

  // Calculate avatar - memoized to prevent flashing
  const { userFullName, avatarSrc } = useMemo(() => {
    // Wait for profile to load before using it to prevent initial flash
    // If profile is loading, use a consistent fallback until it's ready
    const fullName = (!isProfileLoading && profile?.firstName && profile?.lastName)
      ? `${profile.firstName} ${profile.lastName}`
      : user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

    const avatarUrl = (!isProfileLoading)
      ? getProfilePictureUrl(profile?.userId, profile?.profilePicture) || user?.user_metadata?.avatar_url || undefined
      : user?.user_metadata?.avatar_url || undefined;

    return { userFullName: fullName, avatarSrc: avatarUrl };
  }, [isProfileLoading, profile?.firstName, profile?.lastName, profile?.profilePicture, profile?.userId, user?.user_metadata?.name, user?.user_metadata?.avatar_url, user?.email]);

  const isActive = (href: string) => pathname === href;

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      // Ignore sign out errors
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
        <nav className="mx-auto max-w-6xl rounded-full border border-white/20 bg-black/40 backdrop-blur-xl px-6 shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/jobhorizons-logo.webp"
                alt="JobHorizons - Freelance Remote Work Platform Logo"
                width={120}
                height={24}
                priority
              />
            </Link>

            {/* Navigation - Hidden on mobile */}
            <div className="hidden lg:flex items-center gap-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'text-white'
                      : 'text-white/70 hover:text-white'
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
                className="lg:hidden h-9 w-9 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center text-white"
                aria-label="Toggle mobile menu"
              >
                <div className="relative w-5 h-4 flex flex-col justify-between">
                  <span className={`w-full h-0.5 bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                  <span className={`w-full h-0.5 bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
                  <span className={`w-full h-0.5 bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
                </div>
              </button>

              {user ? (
                <>
                  {/* Token Counter (Desktop) - Only for Freelancers */}
                  {userRole === 'FREELANCER' && tokenStatus && (
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm font-medium text-white">{tokenStatus.currentTokens}</span>
                    </div>
                  )}

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
                          className="h-9 w-9 rounded-full p-0 hover:bg-white/10 transition-colors"
                        >
                          <Avatar className="h-8 w-8 border border-white/20">
                            <AvatarImage src={avatarSrc} alt={userFullName} />
                            <AvatarFallback className="bg-white/10 text-white">
                              <UserIcon className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-56"
                        align="end"
                        sideOffset={8}
                      >
                        <DropdownMenuItem
                          className="gap-3 py-3 cursor-pointer hover:bg-white/10 text-white"
                          onClick={handleDashboardClick}
                        >
                          <Briefcase className="h-4 w-4" />
                          <span>Dashboard</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-3 py-3 cursor-pointer hover:bg-white/10 text-white"
                          onClick={() => router.push('/dashboard?tab=messages')}
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>Messages</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-3 py-3 cursor-pointer hover:bg-white/10 text-white"
                          onClick={() => router.push('/dashboard?tab=proposals')}
                        >
                          <FileText className="h-4 w-4" />
                          <span>My Proposals</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-3 py-3 cursor-pointer hover:bg-white/10 text-white"
                          onClick={() => router.push('/dashboard?tab=subscription')}
                        >
                          <CreditCard className="h-4 w-4" />
                          <span>Subscription</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-3 py-3 cursor-pointer hover:bg-white/10 text-white"
                          onClick={() => router.push('/dashboard?tab=profile')}
                        >
                          <UserIcon className="h-4 w-4" />
                          <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/20" />
                        <DropdownMenuItem
                          className="gap-3 py-3 cursor-pointer hover:bg-white/10 text-red-400"
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
                  <Link href="/auth/signin">
                    <Button
                      variant="ghost"
                      className="text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button className="text-sm font-medium bg-white text-gray-900 hover:bg-white/90 transition-colors rounded-full">
                      Get Started
                    </Button>
                  </Link>
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

            {user ? (
              <>
                {/* User Menu Items */}
                <div className="space-y-4 mb-8 border-t border-white/20 pt-8">
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 text-xl font-medium text-white/70 hover:text-white transition-all hover:translate-x-2"
                  >
                    <Briefcase className="h-5 w-5" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 text-xl font-medium text-white/70 hover:text-white transition-all hover:translate-x-2"
                  >
                    <Bell className="h-5 w-5" />
                    <span>Notifications</span>
                  </Link>
                </div>

                {/* Token Counter for Freelancers */}
                {userRole === 'FREELANCER' && tokenStatus && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8 w-fit">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    <span className="text-lg font-medium text-white">{tokenStatus.currentTokens} tokens</span>
                  </div>
                )}

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
