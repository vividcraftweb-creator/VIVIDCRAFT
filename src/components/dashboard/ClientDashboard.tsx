'use client';

import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import VerificationCard from './VerificationCard';
import ClientVerificationForm from './ClientVerificationForm';
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
import ClientVerificationWizard from '../verification/ClientVerificationWizard';
import VerificationBanner from './VerificationBanner';
import RecommendationsSection from './RecommendationsSection';
import AnalyticsView from './AnalyticsView';
import dynamic from 'next/dynamic';

const SubscriptionView = dynamic(() => import('./SubscriptionView'), { ssr: false });
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'subscription' | 'team' | 'projects' | 'support' | 'crm' | 'myjobs' | 'messages' | 'apikeys' | 'webhooks' | 'profile' | 'settings' | 'verification' | 'analytics'>('dashboard');
  const [jobFilter, setJobFilter] = useState<'all' | 'open' | 'under-review' | 'closed'>('all');
  const [isProfileEditMode, setIsProfileEditMode] = useState(false);

  // Sync activeTab with URL parameter from sidebar navigation
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['dashboard', 'subscription', 'team', 'projects', 'support', 'crm', 'myjobs', 'messages', 'apikeys', 'webhooks', 'profile', 'settings', 'verification', 'analytics'].includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab);
    } else {
      setActiveTab('dashboard');
    }
  }, [searchParams]);

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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card p-6 rounded-2xl bg-white/5 border border-white/10 animate-pulse">
                <div className="h-4 bg-white/10 rounded mb-2"></div>
                <div className="h-8 bg-white/20 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Verification Banner - Shows status-based alerts */}
        <VerificationBanner />

        {/* Stats Overview */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-4 sm:p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium uppercase tracking-wide">Commissions &amp; Projects Posted</p>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1 transition-all duration-500 group-hover:translate-y-0.5">
                {totalJobsCount}
              </p>
              <p className="text-blue-300 text-sm mt-1 flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                {openJobCount} open commissions live
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors">
              <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-blue-300" />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-200 text-sm font-medium uppercase tracking-wide">Artist Proposals Received</p>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1 transition-all duration-500 group-hover:translate-y-0.5">
                {proposalsReceivedCount}
              </p>
              <p className="text-emerald-300 text-sm mt-1 flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Across your active listings
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors">
              <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-300" />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-400/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-200 text-sm font-medium uppercase tracking-wide">Pending Decisions</p>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1 transition-all duration-500 group-hover:translate-y-0.5">
                {pendingProposalsCount}
              </p>
              <p className="text-amber-300 text-sm mt-1 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Awaiting your review
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-amber-500/20 rounded-xl group-hover:bg-amber-500/30 transition-colors">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-amber-300" />
            </div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm font-medium uppercase tracking-wide">Artist Consultations</p>
              <p className="text-2xl sm:text-3xl font-bold text-white mt-1 transition-all duration-500 group-hover:translate-y-0.5">
                {interviewsInProgressCount}
              </p>
              <p className="text-purple-300 text-sm mt-1 flex items-center gap-1">
                <UserCheck className="h-4 w-4" />
                Active artist inquiries
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-500/20 rounded-xl group-hover:bg-purple-500/30 transition-colors">
              <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-purple-300" />
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
          <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-white/5 border border-white/10">
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
                    <SelectTrigger className="w-full sm:w-44 bg-white/5 border border-white/10 text-slate-200 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 text-slate-100 border border-white/10">
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
                <div key={job.id} className="flex items-start sm:items-center flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
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
          <div className="glass-card p-6 rounded-3xl bg-white/5 border border-white/10 shadow-lg shadow-blue-500/10">
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
                    <div key={index} className="h-12 bg-white/10 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : recentConversations.length > 0 ? (
                recentConversations.map((conversationItem) => {
                  const partnerDetails = getConversationPartner(conversationItem);
                  return (
                    <div
                      key={conversationItem.partnerId}
                      className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
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
          <div className="glass-card p-6 rounded-3xl bg-white/5 border border-white/10 shadow-lg shadow-amber-500/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Notifications Summary</h3>
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Bell className="h-5 w-5 text-amber-300" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
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

              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
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
                    <div key={index} className="h-10 bg-white/10 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : recentNotifications.length > 0 ? (
                recentNotifications.map((notification: any) => (
                  <div key={notification.id} className="p-3 bg-white/5 rounded-xl border border-white/10">
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

      {activeTab === 'verification' && (
        <div className="space-y-8">
          <ClientVerificationWizard />
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
