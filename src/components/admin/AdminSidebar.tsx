'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileCheck,
  MessageSquare,
  LifeBuoy,
  BarChart3,
  Settings,
  Shield,
  CreditCard,
  Building2,
  ScrollText,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { createClient } from '@/lib/supabase/client';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  description: string;
}

export default function AdminSidebar() {
  const [mounted, setMounted] = useState(false);
  const [directProfileCount, setDirectProfileCount] = useState<number | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { data: stats } = trpc.admin.getSystemStats.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: mounted,
  });

  useEffect(() => {
    setMounted(true);
    async function fetchProfilesCount() {
      try {
        const supabase = createClient();
        const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        if (!error && typeof count === 'number') {
          setDirectProfileCount(count);
        }
      } catch (e) {}
    }
    fetchProfilesCount();
  }, []);

  const handleSignOut = async (e?: React.MouseEvent) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      document.cookie = 'mock_admin_session=; path=/; max-age=0; SameSite=Lax';
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      router.push('/');
      router.refresh();
    }
  };

  if (!mounted) {
    return <div className="w-64 h-screen bg-slate-900 border-r border-white/10 fixed left-0 top-0 z-40" />;
  }

  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      description: 'Overview & analytics',
    },
    {
      title: 'User Management',
      href: '/admin/users',
      icon: Users,
      description: 'Manage all users',
    },
    {
      title: 'Job Moderation',
      href: '/admin/jobs',
      icon: Briefcase,
      description: 'Review & approve jobs',
    },
    {
      title: 'Verifications',
      href: '/admin/verifications',
      icon: FileCheck,
      badge: stats?.pendingVerifications,
      description: 'Identity verification queue',
    },
    {
      title: 'Proposals',
      href: '/admin/proposals',
      icon: CheckCircle2,
      description: 'Proposal monitoring',
    },
    {
      title: 'Messages',
      href: '/admin/messages',
      icon: MessageSquare,
      description: 'Communication oversight',
    },
    {
      title: 'Chat Controls',
      href: '/admin/chats',
      icon: MessageSquare,
      description: 'Manage chat connections',
    },
    {
      title: 'Artworks',
      href: '/admin/artworks',
      icon: LayoutDashboard,
      description: 'Monitor listed artworks',
    },
    {
      title: 'Support',
      href: '/admin/support',
      icon: LifeBuoy,
      description: 'Support tickets',
    },
    {
      title: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      description: 'Reports & insights',
    },
    {
      title: 'Subscriptions',
      href: '/admin/subscriptions',
      icon: CreditCard,
      description: 'Billing management',
    },
    {
      title: 'Fraud & Security',
      href: '/admin/fraud-review',
      icon: Shield,
      description: 'Security monitoring',
    },
    {
      title: 'Organizations',
      href: '/admin/organizations',
      icon: Building2,
      description: 'Team & enterprise accounts',
    },
    {
      title: 'Audit Logs',
      href: '/admin/audit-logs',
      icon: ScrollText,
      description: 'Activity monitoring',
    },
    {
      title: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      description: 'System configuration',
    },
  ];

  return (
    <div className="flex h-screen w-64 flex-col fixed left-0 top-0 z-40 border-r border-white/10 bg-slate-900">
      {/* Logo/Header */}
      <div className="flex h-16 items-center justify-center border-b border-white/10 px-6">
        <Link href="/admin" className="flex items-center gap-2.5 group">
          <svg
            className="w-8 h-8 group-hover:scale-110 transition-transform duration-300"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="adminSidebarLogoGrad1" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
              <linearGradient id="adminSidebarLogoGrad2" x1="48" y1="0" x2="0" y2="48">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <path
              d="M24 4C13 4 6 14 10 24C14 34 20 38 24 44C28 38 34 34 38 24C42 14 35 4 24 4Z"
              fill="url(#adminSidebarLogoGrad1)"
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
            <circle cx="36" cy="12" r="3" fill="url(#adminSidebarLogoGrad2)" />
          </svg>
          <span className="font-bold text-xl tracking-tight text-white">
            Vivid Art
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all group relative',
                isActive
                  ? 'bg-blue-500/20 text-white border border-blue-500/30'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              )}
            >
              <div className="flex items-center space-x-3">
                <Icon className={cn(
                  'h-4 w-4 transition-colors',
                  isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'
                )} />
                <div className="flex flex-col">
                  <span className="text-sm">{item.title}</span>
                  <span className="text-xs text-slate-500 group-hover:text-slate-400">
                    {item.description}
                  </span>
                </div>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="border-t border-white/10 p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">System Status</span>
          <div className="flex items-center space-x-1">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400 font-medium">Operational</span>
          </div>
        </div>
        {(stats || directProfileCount !== null) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/5 rounded px-2 py-1">
              <div className="text-slate-400">Users</div>
              <div className="text-white font-semibold">{Math.max(stats?.totalUsers ?? 0, directProfileCount ?? 0)}</div>
            </div>
            <div className="bg-white/5 rounded px-2 py-1">
              <div className="text-slate-400">Jobs</div>
              <div className="text-white font-semibold">{stats?.totalJobs ?? 0}</div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          type="button"
          onClick={(e) => handleSignOut(e)}
          className="w-full flex items-center justify-center space-x-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/30"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
