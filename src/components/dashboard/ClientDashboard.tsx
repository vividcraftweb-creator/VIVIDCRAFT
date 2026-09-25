'use client';

import { useState, useEffect, useMemo, startTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth as useSession } from '@/hooks/useAuth';
import { trpc } from '@/utils/trpc';
import {
  Briefcase,
  Mail,
  Clock,
  UserCheck,
  MessageSquare,
  Bell,
  Plus,
  ArrowRight,
  Eye,
  Sparkles,
  Globe,
  Palette,
} from 'lucide-react';
import TeamCollaboration from '../collaboration/TeamCollaboration';
import EnhancedProjectManagement from '../project/EnhancedProjectManagement';
import PrioritySupport from '../support/PrioritySupport';
import ProposalTrackingCRM from '../crm/ProposalTrackingCRM';
import MyJobsView from './MyJobsView';
import MessagesView from './MessagesView';
import WebhooksView from './WebhooksView';
import ApiKeysView from './ApiKeysView';
import ProfileEditView from './ProfileEditView';
import ProfileView from './ProfileView';
import SettingsView from './SettingsView';
import RecommendationsSection from './RecommendationsSection';
import AnalyticsView from './AnalyticsView';
import SubscriptionView from './SubscriptionView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PartnerProfile = {
  firstName?: string | null;
  lastName?: string | null;
};

type PartnerRecord = {
  email?: string | null;
  Profile?: PartnerProfile[] | null;
};

type ConversationPreview = {
  partnerId: string;
  partner?: PartnerRecord | PartnerRecord[] | null;
  lastMessage?: {
    content?: string | null;
    createdAt?: string | null;
  } | null;
  unreadCount?: number | null;
};

export default function ClientDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'subscription' | 'team' | 'projects' | 'support' | 'crm' | 'myjobs' | 'messages' | 'apikeys' | 'webhooks' | 'profile' | 'settings' | 'analytics'>('dashboard');
  const [jobFilter, setJobFilter] = useState<'all' | 'open' | 'under-review' | 'closed'>('all');
  const [isProfileEditMode, setIsProfileEditMode] = useState(false);

  // Sync activeTab with URL parameter from sidebar navigation with startTransition
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'verification') {
      router.replace('/dashboard?tab=overview');
      startTransition(() => {
        setActiveTab('dashboard');
      });
      return;
    }
    startTransition(() => {
      if (tabParam === 'overview') {
        setActiveTab('dashboard');
      } else if (tabParam && ['dashboard', 'subscription', 'team', 'projects', 'support', 'crm', 'myjobs', 'messages', 'apikeys', 'webhooks', 'profile', 'settings', 'analytics'].includes(tabParam)) {
        setActiveTab(tabParam as typeof activeTab);
      } else {
        setActiveTab('dashboard');
      }
    });
  }, [searchParams, router]);

  // Sync profile edit mode with URL parameter
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (activeTab === 'profile') {
      setIsProfileEditMode(mode === 'edit');
    }
  }, [searchParams, activeTab]);

  // Only load data when authenticated
  const isAuthenticated = sessionStatus === 'authenticated' && !!session?.session?.user;

  // Load data conditionally based on active tab
  const { data: stats, isLoading: statsLoading } =
    trpc.clients.getDashboardStats.useQuery(undefined, {
      enabled: isAuthenticated && activeTab === 'dashboard',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
  const { data: jobs, isLoading: jobsLoading } =
    trpc.jobs.getJobsForClient.useQuery(undefined, {
      enabled: isAuthenticated && (activeTab === 'dashboard' || activeTab === 'projects' || activeTab === 'myjobs'),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
  const { data: currentUser, isLoading: userLoading } =
    trpc.user.getCurrentUser.useQuery(undefined, {
      enabled: isAuthenticated && activeTab === 'dashboard',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
  const { data: conversations, isLoading: conversationsLoading } =
    trpc.messages.getConversations.useQuery(undefined, {
      enabled: isAuthenticated && activeTab === 'dashboard',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
  const { data: notifications, isLoading: notificationsLoading } =
    trpc.notifications.getNotifications.useQuery({}, {
      enabled: isAuthenticated && activeTab === 'dashboard',
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
  const { data: userProfile } = trpc.profiles.getMyProfile.useQuery({}, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const userName = useMemo(() => {
    // 1. Try first_name / last_name from profiles table
    const p = userProfile as any;
    const fName = p?.firstName || p?.first_name || '';
    const lName = p?.lastName || p?.last_name || '';
    const combined = [fName, lName].filter(Boolean).join(' ').trim();
    if (combined && combined.toLowerCase() !== 'artist' && combined.toLowerCase() !== 'user') {
      return combined;
    }

    // 2. Try full_name or display_name
    const fullName = p?.full_name || p?.display_name || p?.name;
    if (fullName && fullName.toLowerCase() !== 'artist' && fullName.toLowerCase() !== 'user') {
      return fullName;
    }

    // 3. Try session user metadata or name
    const sessionUser = (session as any)?.session?.user || (session as any)?.user;
    const metaFullName = (sessionUser as any)?.user_metadata?.full_name || (sessionUser as any)?.user_metadata?.name;
    if (metaFullName && metaFullName.toLowerCase() !== 'artist' && metaFullName.toLowerCase() !== 'user') {
      return metaFullName;
    }

    if (sessionUser?.name && sessionUser.name.toLowerCase() !== 'artist' && sessionUser.name.toLowerCase() !== 'user') {
      return sessionUser.name;
    }

    // 4. Try email prefix or fallback
    if (sessionUser?.email) {
      const emailPrefix = sessionUser.email.split('@')[0];
      if (emailPrefix) {
        return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      }
    }

    return 'Collector';
  }, [userProfile, session]);

  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setForceReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const isLoading = !forceReady && (statsLoading || jobsLoading || userLoading);
  const showSkeleton = isLoading && !stats;

  const {
    totalJobsCount,
    proposalsReceivedCount,
    pendingProposalsCount,
    interviewsInProgressCount,
    openJobCount,
  } = stats ?? {
    totalJobsCount: 0,
    proposalsReceivedCount: 0,
    pendingProposalsCount: 0,
    interviewsInProgressCount: 0,
    openJobCount: 0,
  };

  const jobsWithMeta = useMemo(() => {
    const jobList = Array.isArray(jobs) ? jobs : [];

    return jobList
      .slice()
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .map((job) => {
        const proposalsForJob = Array.isArray(job.proposals) ? job.proposals : [];
        const pendingForJob = proposalsForJob.filter((proposal: { status?: string }) => proposal.status === 'PENDING');
        const underReview = job.status === 'OPEN' && pendingForJob.length > 0;

        return {
          ...job,
          proposalsForJob,
          pendingForJob,
          underReview,
        };
      });
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (jobFilter === 'all') {
      return jobsWithMeta;
    }

    if (jobFilter === 'open') {
      return jobsWithMeta.filter((job) => job.status === 'OPEN');
    }

    if (jobFilter === 'closed') {
      return jobsWithMeta.filter((job) => job.status === 'CLOSED');
    }

    return jobsWithMeta.filter((job) => job.underReview);
  }, [jobsWithMeta, jobFilter]);

  const recentJobs = filteredJobs.slice(0, 5);
  const jobFilterOptions: { value: typeof jobFilter; label: string }[] = [
    { value: 'all', label: 'All Jobs' },
    { value: 'open', label: 'Open' },
    { value: 'under-review', label: 'Under Review' },
    { value: 'closed', label: 'Closed' },
  ];
  const recentConversations = useMemo<ConversationPreview[]>(
    () => (Array.isArray(conversations) ? (conversations.slice(0, 3) as ConversationPreview[]) : []),
    [conversations],
  );
  const recentNotifications = useMemo(() => {
    if (Array.isArray(notifications)) return notifications.slice(0, 3);
    if (Array.isArray((notifications as any)?.notifications)) return (notifications as any).notifications.slice(0, 3);
    return [];
  }, [notifications]);

  const renderDashboardContent = () => {
    const getConversationPartner = (conversation: ConversationPreview) => {
      const partnerRaw = Array.isArray(conversation?.partner) ? conversation.partner[0] : conversation?.partner;
      const profileRaw = Array.isArray(partnerRaw?.Profile) ? partnerRaw.Profile[0] : partnerRaw?.Profile;
      const firstName = profileRaw?.firstName ?? '';
      const lastName = profileRaw?.lastName ?? '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      const email = partnerRaw?.email ?? '';
      const emailUsername = email ? email.split('@')[0] : '';

      return {
        name: fullName || emailUsername || 'User',
        email: email,
      };
    };

    const totalUnreadMessages = Array.isArray(conversations)
      ? conversations.reduce((total, conversationItem) => total + (conversationItem.unreadCount || 0), 0)
      : 0;

    if (showSkeleton) {
      return (
        <div className="space-y-6">
          <div className="rounded-2xl sm:rounded-3xl border border-[#E6E0D5] dark:border-white/10 bg-[#F8F6F1] dark:bg-[#1E1B18] p-6 sm:p-8 lg:p-10 animate-pulse">
            <div className="h-6 w-52 bg-[#A2694E]/20 rounded-full mb-6" />
            <div className="h-9 w-72 bg-slate-300 dark:bg-slate-800 rounded-xl mb-3" />
            <div className="h-5 w-96 max-w-full bg-slate-200 dark:bg-slate-800/60 rounded-lg mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-[#E6E0D5] dark:border-white/10">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-white/70 dark:bg-white/[0.03] rounded-2xl border border-[#E6E0D5] dark:border-white/10" />
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Prominent Trilingual Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#E6E0D5] dark:border-white/10 bg-gradient-to-br from-[#F8F6F1] via-[#FAF8F5] to-[#F1ECE1] dark:from-[#1E1B18] dark:via-[#1A1715] dark:to-[#241F1B] p-6 sm:p-8 lg:p-10 shadow-lg shadow-[#A2694E]/5 dark:shadow-none transition-all duration-300">
          {/* Subtle Ambient Decorative Glows */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#A2694E]/10 dark:bg-[#A2694E]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Row: Portal Badge & Quick Action Buttons */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#A2694E]/10 dark:bg-[#A2694E]/25 border border-[#A2694E]/30 text-[#A2694E] dark:text-[#E8B89B] text-xs font-semibold uppercase tracking-wider w-fit">
              <Sparkles className="h-3.5 w-3.5 text-[#A2694E] dark:text-[#E8B89B]" />
              <span>Cinnamon Gallery • Client Portal</span>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/gallery">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-[#E6E0D5] dark:border-white/15 bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-800 dark:text-white text-xs font-semibold px-3.5 py-2 shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Palette className="h-3.5 w-3.5 text-[#A2694E] dark:text-[#E8B89B]" />
                  <span>Explore Gallery</span>
                </Button>
              </Link>
              <Link href="/jobs/create">
                <Button
                  size="sm"
                  className="rounded-xl bg-[#A2694E] hover:bg-[#8F5B42] text-white text-xs font-semibold px-3.5 py-2 shadow-sm shadow-[#A2694E]/25 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Post Commission</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Main Hero Header */}
          <div className="relative z-10 max-w-3xl mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Welcome back, <span className="text-[#A2694E] dark:text-[#E8B89B]">{userName}</span>!
            </h2>
            <p className="mt-2 text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
              Explore unique Sri Lankan artwork, connect with master creators, and manage your bespoke art commissions seamlessly.
            </p>
          </div>

          {/* Trilingual Greeting Cards Grid */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-[#E6E0D5] dark:border-white/10">
            {/* English Greeting Card */}
            <div className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-[#1E1B18]/70 border border-[#E6E0D5] dark:border-white/10 hover:border-[#A2694E]/50 dark:hover:border-[#A2694E]/50 transition-all duration-300 shadow-sm group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#A2694E]/10 dark:bg-[#A2694E]/20 text-[#A2694E] dark:text-[#E8B89B] border border-[#A2694E]/20 text-[11px] font-bold uppercase tracking-wider">
                    <Globe className="h-3 w-3" />
                    English
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">EN</span>
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                  Welcome back, <span className="font-semibold text-slate-900 dark:text-white">{userName}</span>! Explore unique artwork &amp; manage your commissions.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center text-xs text-[#A2694E] dark:text-[#E8B89B] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View commissions</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </div>

            {/* Sinhala Greeting Card */}
            <div className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-[#1E1B18]/70 border border-[#E6E0D5] dark:border-white/10 hover:border-[#A2694E]/50 dark:hover:border-[#A2694E]/50 transition-all duration-300 shadow-sm group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#A2694E]/10 dark:bg-[#A2694E]/20 text-[#A2694E] dark:text-[#E8B89B] border border-[#A2694E]/20 text-[11px] font-bold uppercase tracking-wider">
                    <Globe className="h-3 w-3" />
                    සිංහල
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">SI</span>
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                  සාදරයෙන් පිළිගනිමු, <span className="font-semibold text-slate-900 dark:text-white">{userName}</span>! අපගේ කලා නිර්මාණ නරඹන්න සහ ඔබගේ ඇණවුම් කළමනාකරණය කරන්න.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center text-xs text-[#A2694E] dark:text-[#E8B89B] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>ඇණවුම් පරීක්ෂා කරන්න</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </div>

            {/* Tamil Greeting Card */}
            <div className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-[#1E1B18]/70 border border-[#E6E0D5] dark:border-white/10 hover:border-[#A2694E]/50 dark:hover:border-[#A2694E]/50 transition-all duration-300 shadow-sm group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#A2694E]/10 dark:bg-[#A2694E]/20 text-[#A2694E] dark:text-[#E8B89B] border border-[#A2694E]/20 text-[11px] font-bold uppercase tracking-wider">
                    <Globe className="h-3 w-3" />
                    தமிழ்
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">TA</span>
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                  வரவேற்கிறோம், <span className="font-semibold text-slate-900 dark:text-white">{userName}</span>! கலைப் படைப்புகளை ஆராய்ந்து உங்கள் ஆர்டர்களை நிர்வகிக்கவும்.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center text-xs text-[#A2694E] dark:text-[#E8B89B] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>ஆர்டர்களை நிர்வகிக்க</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </div>
          </div>
        </div>

      {/* AI Recommendations Section */}
      <RecommendationsSection />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column - Projects */}
        <div className="lg:col-span-2 space-y-8">

          {/* Recent Projects */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl shadow-sm">
            <div className="flex flex-col gap-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Your Commissions &amp; Projects</h3>
                  <p className="text-sm sm:text-base text-slate-400">
                    Manage your active commission postings and review proposals from artists.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Quick Filters</p>
                  <Select value={jobFilter} onValueChange={(value) => setJobFilter(value as typeof jobFilter)}>
                    <SelectTrigger className="w-full sm:w-44 bg-slate-950 border border-slate-800 text-slate-200 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 text-slate-100 border border-slate-800">
                      {jobFilterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="focus:bg-primary/20 focus:text-white">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Showing {recentJobs.length} of {filteredJobs.length} jobs
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-start sm:items-center flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-all duration-300">
                  <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                    <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm sm:text-base truncate">{job.title}</p>
                    <p className="text-slate-400 text-xs sm:text-sm">
                      Budget: ${job.budget} • {job.proposalsForJob.length} proposals • {job.pendingForJob.length} awaiting review
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center">
                    <Badge 
                      className={`${
                        job.status === 'CLOSED' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                        job.status === 'PAUSED' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                        job.status === 'OPEN' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                        'bg-gray-500/20 text-gray-300 border-gray-500/30'
                      }`}
                    >
                      {job.status}
                    </Badge>
                    <Button asChild size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10">
                      <Link href={`/jobs/${job.slug || job.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}

              {recentJobs.length === 0 && jobsWithMeta.length > 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">
                  No jobs match this filter yet. Try a different view to continue reviewing proposals.
                </div>
              )}

              {jobsWithMeta.length === 0 && (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-300 font-medium mb-2">No commissions posted yet</p>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto mb-4">
                    Publish a commission request to start receiving tailored artist proposals.
                  </p>
                  <Button asChild className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30">
                    <Link href="/jobs/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Post Your First Commission
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Actions and Info */}
        <div className="space-y-8">
          {/* Recent Messages */}
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Recent Messages</h3>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-300" />
              </div>
            </div>

            <div className="space-y-4">
              {conversationsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="h-12 bg-slate-800 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : recentConversations.length > 0 ? (
                recentConversations.map((conversationItem) => {
                  const partnerDetails = getConversationPartner(conversationItem);
                  return (
                    <div
                      key={conversationItem.partnerId}
                      className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-white truncate">{partnerDetails.name}</p>
                        {conversationItem.unreadCount ? (
                          <Badge className="bg-primary/20 border-primary/30 text-primary text-xs">
                            {conversationItem.unreadCount} unread
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {conversationItem.lastMessage?.content || 'No messages yet; start the conversation.'}
                      </p>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 uppercase tracking-wide">
                        <span>{partnerDetails.email}</span>
                        {conversationItem.lastMessage?.createdAt && (
                          <span>{new Date(conversationItem.lastMessage.createdAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-5">
                  <MessageSquare className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-white font-medium">No messages yet</p>
                  <p className="text-slate-400 text-sm">
                    Shortlisted freelancers will appear here as soon as they reply.
                  </p>
                </div>
              )}
            </div>
            <Link href="/messages" className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:text-primary/80">
              Go to Inbox
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Notifications Summary */}
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Notifications Summary</h3>
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Bell className="h-5 w-5 text-amber-300" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <Clock className="h-4 w-4 text-amber-300 mt-0.5" />
                <div>
                  <p className="text-sm text-white font-medium">
                    {pendingProposalsCount > 0 ? `${pendingProposalsCount} pending decisions` : 'No pending decisions'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {pendingProposalsCount > 0
                      ? 'Review proposals to keep interviews moving.'
                      : 'Track new proposals as they arrive to stay ahead.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <MessageSquare className="h-4 w-4 text-blue-300 mt-0.5" />
                <div>
                  <p className="text-sm text-white font-medium">
                    {totalUnreadMessages > 0
                      ? `${totalUnreadMessages} new message${totalUnreadMessages > 1 ? 's' : ''}`
                      : 'No new messages'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {totalUnreadMessages > 0
                      ? 'Follow up with freelancers awaiting feedback.'
                      : 'Reach out to shortlisted freelancers to keep conversations moving.'}
                  </p>
                </div>
              </div>

              {notificationsLoading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, index) => (
                    <div key={index} className="h-10 bg-slate-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : recentNotifications.length > 0 ? (
                recentNotifications.map((notification: any) => (
                  <div key={notification.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <p className="text-sm text-white">{notification.message}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  You are all caught up. New proposal and message alerts will surface here.
                </p>
              )}
            </div>
            <Link href="/notifications" className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:text-primary/80">
              View Activity Log
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </div>
      </>
    );
  };

  return (
    <div className="space-y-8">
      {/* Tab Content - Controlled by sidebar navigation */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {renderDashboardContent()}
        </div>
      )}
      
      {activeTab === 'team' && (
        <div className="space-y-8">
          <TeamCollaboration />
        </div>
      )}
      
      {activeTab === 'projects' && (
        <div className="space-y-8">
          <EnhancedProjectManagement />
        </div>
      )}
      
      {activeTab === 'support' && (
        <div className="space-y-8">
          <PrioritySupport />
        </div>
      )}

      {activeTab === 'crm' && (
        <div className="space-y-8">
          <ProposalTrackingCRM />
        </div>
      )}

      {activeTab === 'myjobs' && (
        <div className="space-y-8">
          <MyJobsView />
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="space-y-8">
          <MessagesView />
        </div>
      )}

      {activeTab === 'subscription' && (
        <SubscriptionView />
      )}

      {activeTab === 'apikeys' && (
        <ApiKeysView />
      )}

      {activeTab === 'webhooks' && (
        <WebhooksView />
      )}

      {activeTab === 'profile' && (
        <div className="space-y-8">
          {isProfileEditMode ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
                <Button
                  onClick={() => {
                    setIsProfileEditMode(false);
                    router.push('/dashboard?tab=profile');
                  }}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
              <ProfileEditView />
            </>
          ) : (
            <ProfileView />
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-8">
          <SettingsView />
        </div>
      )}


      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <AnalyticsView />
        </div>
      )}
    </div>
  );
}
