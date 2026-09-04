'use client';

import { useState, useEffect } from 'react';
import { useAuth as useSession } from '@/hooks/useAuth';
import { trpc } from '@/utils/trpc';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  FileText,
  MessageSquare,
  CheckCircle,
  CreditCard,
  TrendingUp,
  Clock,
  Star,
  Award,
  Activity,
  Target,
  BarChart3,
  User as UserIcon,
  Send,
  Eye,
  EyeOff,
  Globe,
  Headphones,
  Loader2,
  MoreHorizontal,
  X
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { type Proposal } from '@/types/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getProfilePictureUrl } from '@/lib/profile-helpers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/shared/data-table/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { NotificationsSettings } from '@/components/settings/NotificationsSettings';
import dynamic from 'next/dynamic';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/router';
import type { SupportLevel } from '@/lib/subscription-plans';
import { createClient } from '@/lib/supabase/client';

// Dynamically import components to avoid SSR issues
const ProfileView = dynamic(() => import('./ProfileView'), { ssr: false });
const ClientVerificationWizard = dynamic(() => import('../verification/ClientVerificationWizard'), { ssr: false });
const SubscriptionView = dynamic(() => import('./SubscriptionView'), { ssr: false });
const GalleryView = dynamic(() => import('./GalleryView'), { ssr: false });

// Define types for our table data, including relations
// We override date fields to be strings, as they are serialized over the wire
type ProposalWithJob = Omit<Proposal, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
  job: {
    title: string;
    budget: number;
  };
};

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditProposalModal } from '../proposals/EditProposalModal';
import { toast } from 'sonner';

type ContactListItem = inferRouterOutputs<AppRouter>['profiles']['getContacts'][number];

interface FreelancerDashboardProps {
  view?: 'dashboard' | 'messages' | 'proposals' | 'profile' | 'verification' | 'settings' | 'subscription' | 'gallery';
}

export default function FreelancerDashboard({ view = 'dashboard' }: FreelancerDashboardProps) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isWithdrawAlertOpen, setWithdrawAlertOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalWithJob | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactListItem | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const hasLoadedSession = sessionStatus !== 'loading';

  const utils = trpc.useUtils();

  const [forceReady, setForceReady] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => setForceReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Only load data when session is available and for the active view
  const isAuthenticated = sessionStatus === 'authenticated' && !!session?.session?.user;

  const { data: planSummary, isLoading: planSummaryLoading } = trpc.user.getPlanFeatures.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const sessionUserId = session?.session?.user?.id;

  // Verification banner dismissal state
  const BANNER_DISMISS_KEY = `verification_banner_dismissed_${sessionUserId}`;
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);
  const [directVerification, setDirectVerification] = useState<{ isVerified: boolean; status: string } | null>(null);

  useEffect(() => {
    async function checkAuthVerification() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: verifDocs } = await supabase
            .from('Verification')
            .select('*')
            .eq('userId', user.id);

          const { data: prof } = await (supabase as any)
            .from('profiles')
            .select('isVerified, is_verified')
            .eq('id', user.id)
            .maybeSingle();

          const isApproved = Boolean(prof?.isVerified || prof?.is_verified || verifDocs?.some((d: any) => d.status === 'APPROVED'));
          const isPending = Boolean(verifDocs?.some((d: any) => d.status === 'PENDING'));
          const isRejected = Boolean(verifDocs?.some((d: any) => d.status === 'REJECTED'));

          setDirectVerification({
            isVerified: isApproved,
            status: isApproved ? 'approved' : isPending ? 'pending' : isRejected ? 'rejected' : 'not_started',
          });
        }
      } catch (e) {}
    }
    checkAuthVerification();
  }, []);

  const planPermissions = planSummary?.permissions;
  const analyticsLevel = 'advanced';
  const marketInsightsEnabled = true;
  const supportLevel: SupportLevel = 'priority-email';

  const supportLabelMap: Record<SupportLevel, string> = {
    email: 'Email support',
    'priority-email': 'Priority email support',
    dedicated: 'Dedicated concierge support',
  };
  const supportLabel = supportLabelMap[supportLevel] ?? 'Priority email support';

  const { data: proposals, isLoading: proposalsLoading } =
    trpc.proposals.getProposalsForFreelancer.useQuery(undefined, {
      enabled: isAuthenticated && (view === 'dashboard' || view === 'proposals'),
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
  const { data: rawVerificationStatus, isLoading: verificationLoading } =
    trpc.verifications.checkVerificationStatus.useQuery(undefined, {
      enabled: isAuthenticated && (view === 'dashboard' || view === 'verification'),
      retry: false,
      refetchInterval: 5000, // Auto-refetch every 5 seconds
      refetchOnWindowFocus: true,
      refetchOnReconnect: false,
    });

  const verificationStatus = (rawVerificationStatus && rawVerificationStatus.message !== 'User not found')
    ? rawVerificationStatus
    : {
        isVerified: directVerification?.isVerified ?? false,
        status: (directVerification?.status as any) ?? 'not_started',
        message: directVerification?.isVerified
          ? 'Identity verification approved'
          : directVerification?.status === 'pending'
          ? 'Your ID is under review'
          : 'Upload a government-issued ID to fully activate your account and apply for jobs.',
        requiredDocs: ['ID_FRONT', 'ID_BACK', 'SELFIE'],
        uploadedDocs: [],
        missingDocs: [],
        rejectedDocs: [],
      };

  const hasFetchedVerification = rawVerificationStatus !== undefined || directVerification !== null;

  // Load banner dismiss state from localStorage
  useEffect(() => {
    if (sessionUserId && hasFetchedVerification) {
      const dismissed = localStorage.getItem(BANNER_DISMISS_KEY);
      if (dismissed === 'true') {
        setIsBannerDismissed(true);
      }
    }
  }, [sessionUserId, hasFetchedVerification, BANNER_DISMISS_KEY]);

  const { data: messages, isLoading: messagesLoading } = trpc.messages.getMessages.useQuery(
    { receiverId: selectedContact?.id || '' },
    { enabled: isAuthenticated && !!selectedContact && view === 'messages', retry: false }
  );
  const { data: tokenData, isLoading: tokensLoading } =
    trpc.profiles.getTokenData.useQuery(undefined, {
      enabled: isAuthenticated && view === 'dashboard',
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
  const { data: profileCompletenessData, isLoading: completenessLoading, refetch: refetchCompleteness } =
    trpc.publicProfile.getCompleteness.useQuery(undefined, {
      enabled: isAuthenticated && view === 'dashboard',
      retry: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 0,
    });
  const { data: contacts } = trpc.profiles.getContacts.useQuery(undefined, {
    enabled: isAuthenticated && view === 'messages',
    retry: false,
  });
  const { data: myProfile, refetch: refetchMyProfile } = trpc.profiles.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const [directProfile, setDirectProfile] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const sendMessageMutation = trpc.messages.sendMessage.useMutation({
    onSuccess: () => {
      utils.messages.getMessages.invalidate();
      utils.messages.getUnreadMessageCount.invalidate();
      setMessageText('');
    },
  });

  const withdrawMutation = trpc.proposals.withdrawProposal.useMutation({
    onSuccess: () => {
      toast.success('Proposal withdrawn successfully.');
      utils.proposals.getProposalsForFreelancer.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to withdraw proposal', { description: error.message });
    },
  });

  const togglePublishMutation = trpc.publicProfile.togglePublish.useMutation();

  const fetchProfileDirect = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = user?.id || sessionUserId;
      if (!targetUserId) return;

      const metadata = user?.user_metadata || {};

      const { data } = await (supabase as any)
        .from('profiles')
        .select('*')
        .or(`id.eq.${targetUserId},userId.eq.${targetUserId}`)
        .maybeSingle();

      const isPub = (data?.is_published ?? metadata.is_published) ?? (data?.status === 'published');

      const merged = {
        ...metadata,
        ...(data || {}),
        title: metadata.title || data?.title || '',
        bio: metadata.bio || data?.bio || '',
        skills: metadata.skills || data?.skills || '',
        avatar_url: metadata.avatar_url || data?.avatar_url || '',
        first_name: data?.first_name || metadata.first_name || '',
        last_name: data?.last_name || metadata.last_name || '',
        address: data?.address || metadata.address || '',
        is_published: Boolean(isPub),
        isPublished: Boolean(isPub),
        status: isPub ? 'published' : 'draft',
      };

      setDirectProfile(merged);
    } catch (err) {
      console.warn('Dashboard profile direct load notice:', err);
    }
  };

  useEffect(() => {
    fetchProfileDirect();
  }, [sessionUserId]);

  // Evaluate the 5 steps matching exact database column names
  const evaluatedProfile = directProfile || myProfile;
  const hasAvatar = Boolean(
    evaluatedProfile?.avatar_url || 
    evaluatedProfile?.avatar || 
    evaluatedProfile?.profile_picture || 
    evaluatedProfile?.profilePicture
  );
  const hasName = Boolean(
    evaluatedProfile?.first_name || 
    evaluatedProfile?.last_name || 
    evaluatedProfile?.full_name || 
    evaluatedProfile?.displayName || 
    evaluatedProfile?.display_name || 
    evaluatedProfile?.firstName || 
    evaluatedProfile?.lastName ||
    evaluatedProfile?.name
  );
  const hasTitle = Boolean(
    evaluatedProfile?.title || 
    evaluatedProfile?.professional_title || 
    evaluatedProfile?.professionalTitle
  );
  const hasAddress = Boolean(
    evaluatedProfile?.address || 
    evaluatedProfile?.location
  );
  const rawSkills = evaluatedProfile?.skills;
  const hasSkills = Boolean(
    (Array.isArray(rawSkills) && rawSkills.filter(Boolean).length > 0) ||
    (typeof rawSkills === 'string' && rawSkills.trim().length > 0)
  );

  const directSteps = [
    { field: 'Avatar Photo', value: hasAvatar },
    { field: 'Full Name', value: hasName },
    { field: 'Professional Title', value: hasTitle },
    { field: 'Address', value: hasAddress },
    { field: 'Skills', value: hasSkills },
  ];
  const directCompletedCount = directSteps.filter(s => s.value).length;
  const directPercentage = Math.round((directCompletedCount / directSteps.length) * 100);

  // Combine tRPC calculation and direct calculation
  const profileCompleteness = Math.max(
    profileCompletenessData?.percentage ?? 0,
    directPercentage
  );
  const isProfileComplete = 
    directCompletedCount >= 4 || 
    profileCompleteness >= 80 || 
    (profileCompletenessData?.isComplete ?? false);

  // Dynamically build remaining steps: ONLY incomplete steps are shown
  const missingFields = directSteps
    .filter(s => !s.value)
    .map(s => s.field);

  const isCurrentlyPublished = Boolean(
    directProfile?.is_published ?? directProfile?.isPublished ?? myProfile?.isPublished
  );

  const handleTogglePublish = async () => {
    if (!isProfileComplete && !isCurrentlyPublished) {
      toast.error("Please complete your profile before publishing");
      return;
    }

    const nextState = !isCurrentlyPublished;
    setIsPublishing(true);

    // Optimistic UI update
    setDirectProfile((prev: any) => ({
      ...(prev || {}),
      is_published: nextState,
      isPublished: nextState,
      status: nextState ? 'published' : 'draft',
    }));

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = user?.id || sessionUserId;

      if (targetUserId) {
        // 1. Update Supabase Auth user metadata
        try {
          await supabase.auth.updateUser({
            data: {
              is_published: nextState,
              isPublished: nextState,
            },
          });
        } catch {}

        // 2. Direct Supabase profiles table update
        try {
          await (supabase as any)
            .from('profiles')
            .update({
              is_published: nextState,
              status: nextState ? 'published' : 'draft',
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetUserId);
        } catch (dbErr) {
          console.warn('Direct publish update notice:', dbErr);
        }
      }

      // 3. Server mutation
      await togglePublishMutation.mutateAsync({
        isPublished: nextState,
      });

      // 4. Invalidate all profile queries and refresh Next.js route cache
      utils.profiles.getMyProfile.invalidate();
      utils.profiles.searchFreelancers.invalidate();
      utils.publicProfile.getMyFullProfile.invalidate();
      utils.publicProfile.getCompleteness.invalidate();
      router.refresh();

      toast.success(nextState ? "Profile published successfully!" : "Profile unpublished successfully!");
    } catch (err: any) {
      console.error("Publish toggle error:", err);
      toast.error(`Publish failed: ${err.message || 'Could not update visibility'}`);
      // Revert optimistic update
      setDirectProfile((prev: any) => ({
        ...(prev || {}),
        is_published: !nextState,
        isPublished: !nextState,
        status: !nextState ? 'published' : 'draft',
      }));
    } finally {
      setIsPublishing(false);
    }
  };

  const isLoading =
    !forceReady &&
    ((view === 'dashboard' &&
      (proposalsLoading || verificationLoading || tokensLoading || completenessLoading)) ||
      !hasLoadedSession);

  const handleWithdrawConfirm = () => {
    if (selectedProposal) {
      withdrawMutation.mutate({ proposalId: selectedProposal.id });
    }
    setWithdrawAlertOpen(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !messageText.trim()) return;
    sendMessageMutation.mutate({
      receiverId: selectedContact.id,
      content: messageText,
    });
  };

  const handleDismissBanner = () => {
    if (sessionUserId) {
      localStorage.setItem(BANNER_DISMISS_KEY, 'true');
      setIsBannerDismissed(true);
    }
  };

  const proposalColumns: ColumnDef<ProposalWithJob>[] = [
    {
      id: 'jobTitle',
      accessorKey: 'job.title',
      header: 'Job Title',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
    },
    {
      accessorKey: 'proposedRate',
      header: 'Your Rate',
      cell: ({ row }) => `$${row.original.proposedRate.toFixed(2)}`,
    },
    {
      accessorKey: 'tokenBid',
      header: 'Token Bid',
      cell: ({ row }) => `${row.original.tokenBid ?? 0} tokens`,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const proposal = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  (window.location.href = `/jobs/${proposal.jobId}`)
                }
              >
                View Job
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedProposal(proposal);
                  setEditModalOpen(true);
                }}
                disabled={proposal.status !== 'PENDING'}
              >
                Edit Proposal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedProposal(proposal);
                  setWithdrawAlertOpen(true);
                }}
                disabled={proposal.status !== 'PENDING'}
                className="text-red-500"
              >
                Withdraw
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (!isMounted || isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 animate-pulse">
              <div className="h-4 bg-white/10 rounded mb-2"></div>
              <div className="h-8 bg-white/20 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const acceptedProposals = proposals?.filter((p) => p.status === 'ACCEPTED') || [];

  const freelancerProfileLink =
    myProfile?.slug
      ? `/freelancers/${myProfile.slug}`
      : sessionUserId
      ? `/freelancers/${sessionUserId}`
      : '/freelancers';

  const totalProposals = proposals?.length ?? 0;
  const proposalStatusMap =
    proposals?.reduce<Record<string, number>>((acc, proposal) => {
      const status = proposal.status ?? 'UNKNOWN';
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {}) ?? {};

  const proposalOverview = [
    { label: 'Accepted', count: proposalStatusMap.ACCEPTED ?? 0, color: 'bg-green-500' },
    { label: 'Pending', count: proposalStatusMap.PENDING ?? 0, color: 'bg-yellow-500' },
    { label: 'Rejected', count: proposalStatusMap.REJECTED ?? 0, color: 'bg-rose-500' },
    { label: 'Withdrawn', count: proposalStatusMap.WITHDRAWN ?? 0, color: 'bg-slate-500' },
  ];
  const proposalOverviewRows = proposalOverview.filter((item) => item.count > 0);

  const renderDashboardContent = () => (
    <>
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Verification Notification Banner */}
        {hasFetchedVerification && !verificationLoading && !verificationStatus?.isVerified && (
          <>
            {/* Not Started / Incomplete */}
            {(verificationStatus?.status === 'not_started' || verificationStatus?.status === 'incomplete') && (
              <div className="glass-card p-4 sm:p-6 rounded-2xl lg:rounded-3xl bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-yellow-500/20 rounded-lg flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-yellow-300 mb-2">Account Verification Required</h3>
                    <p className="text-yellow-200/80 mb-4">
                      {verificationStatus?.message || 'Upload a government-issued ID to fully activate your account and apply for jobs. This keeps our marketplace safe for everyone.'}
                    </p>
                    {verificationStatus?.status === 'incomplete' && verificationStatus.missingDocs.length > 0 && (
                      <div className="mb-3 text-sm text-yellow-200/90">
                        <p className="font-semibold mb-1">Missing documents:</p>
                        {verificationStatus.missingDocs.map((doc, idx) => (
                          <div key={idx}>• {doc.replace(/_/g, ' ')}</div>
                        ))}
                      </div>
                    )}
                    <Button asChild className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30">
                      <Link href="/dashboard?tab=verification">
                        <FileText className="h-4 w-4 mr-2" />
                        Upload ID for Verification
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Review */}
            {verificationStatus?.status === 'pending' && (
              <div className="glass-card p-4 sm:p-6 rounded-2xl lg:rounded-3xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                    <Clock className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-300 mb-2">Verification In Review</h3>
                    <p className="text-blue-200/80 mb-4">
                      Thanks for submitting your ID. Our admin typically reviews requests within 1–2 business days. You&apos;ll be notified as soon as it&apos;s approved.
                    </p>
                    <Button asChild className="bg-blue-500/20 border border-blue-500/30 text-blue-200 hover:bg-blue-500/30">
                      <Link href="/dashboard?tab=verification">
                        Check Status
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Rejected */}
            {verificationStatus?.status === 'rejected' && (
              <div className="glass-card p-4 sm:p-6 rounded-2xl lg:rounded-3xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-500/20 rounded-lg flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-300 mb-2">Verification Needs Attention</h3>
                    <p className="text-red-200/80 mb-4">
                      We couldn&apos;t approve the documents provided. Please review the guidelines and resubmit clear photos of your ID.
                    </p>
                    {verificationStatus.rejectedDocs.length > 0 && (
                      <div className="mb-3 text-sm text-red-200/90">
                        <p className="font-semibold mb-1">Rejected documents:</p>
                        {verificationStatus.rejectedDocs.map((doc, idx) => (
                          <div key={idx}>
                            • {doc.type.replace(/_/g, ' ')}: {doc.reason}
                          </div>
                        ))}
                      </div>
                    )}
                    <Button asChild className="bg-red-500/20 border border-red-500/30 text-red-200 hover:bg-red-500/30">
                      <Link href="/dashboard?tab=verification">
                        Resubmit Verification
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Approved - Success Message */}
        {hasFetchedVerification && verificationStatus?.isVerified && verificationStatus?.status === 'approved' && !isBannerDismissed && (
          <div className="glass-card p-4 sm:p-6 rounded-2xl lg:rounded-3xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-300 mb-2">Verification Successful</h3>
                <p className="text-green-200/80">
                  Your account has been verified! You now have full access to all platform features.
                </p>
              </div>
              <button
                onClick={handleDismissBanner}
                className="p-2 hover:bg-green-500/20 rounded-lg transition-colors flex-shrink-0"
                aria-label="Dismiss verification success message"
              >
                <X className="h-5 w-5 text-green-300 hover:text-green-200" />
              </button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Proposals Submitted */}
          <div className="glass-card p-4 sm:p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-400/30 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-300 text-sm font-medium">Proposals Submitted</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  {totalProposals}
                </p>
                <p className="text-indigo-200 text-sm mt-1 flex items-center gap-1">
                  <Send className="h-4 w-4" />
                  {acceptedProposals.length} accepted • {(proposalStatusMap.PENDING ?? 0)} pending
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-indigo-500/20 rounded-xl group-hover:bg-indigo-500/30 transition-colors">
                <Send className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-300" />
              </div>
            </div>
          </div>

          {/* Accepted Proposals */}
          <div className="glass-card p-4 sm:p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-400/30 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm font-medium">Accepted Proposals</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{acceptedProposals.length || 0}</p>
                <p className="text-blue-400 text-sm mt-1 flex items-center">
                  <Activity className="h-4 w-4 mr-1" />
                  {acceptedProposals.length || 0} total wins
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="glass-card p-4 sm:p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm font-medium">Success Rate</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  {proposals && proposals.length > 0 ? Math.round((acceptedProposals.length / proposals.length) * 100) : 0}%
                </p>
                <p className="text-purple-400 text-sm mt-1 flex items-center">
                  <Target className="h-4 w-4 mr-1" />
                  {acceptedProposals.length || 0} of {proposals?.length || 0} proposals
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-500/20 rounded-xl group-hover:bg-purple-500/30 transition-colors">
                <Award className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
              </div>
            </div>
          </div>

        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Analytics and Activity */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Recent Activity */}
            <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-white/5 border border-white/10">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-white">Recent Activity</h3>
                <p className="text-sm sm:text-base text-slate-400">Your latest proposals</p>
              </div>

              <div className="space-y-4">
                {proposals?.slice(0, 5).map((proposal) => (
                  <div key={proposal.id} className="flex items-start sm:items-center flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm sm:text-base truncate">{proposal.job?.title || 'Untitled Job'}</p>
                      <p className="text-slate-400 text-xs sm:text-sm">
                        Proposed: ${proposal.proposedRate || 0}
                      </p>
                    </div>
                    <Badge 
                      className={`${
                        proposal.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                        proposal.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                        'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}
                    >
                      {proposal.status}
                    </Badge>
                  </div>
                ))}

                {(!proposals || proposals.length === 0) && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">No proposals yet</p>
                    <Button asChild className="mt-4 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30">
                      <Link href="/jobs">
                        Find Your First Job
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Earnings / Analytics */}
            <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-white/5 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Proposal Pipeline &amp; Analytics</h3>
                  <p className="text-sm sm:text-base text-slate-400">
                    Understand how your proposals are progressing and plan next steps with clients.
                  </p>
                </div>
                <div className="p-2 bg-primary/20 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>

              {proposalOverviewRows.length > 0 ? (
                <div className="space-y-4">
                  {proposalOverview.map((item) => (
                    <div key={item.label} className="flex items-center space-x-4">
                      <span className="text-slate-300 text-sm w-24">{item.label}</span>
                      <div className="flex-1 bg-white/10 rounded-full h-2">
                        <div
                          className={`${item.color} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${totalProposals > 0 ? Math.round((item.count / totalProposals) * 100) : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-sm font-medium w-12 text-right">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Send proposals to populate your pipeline analytics.
                </div>
              )}
            </div>

            {/* Market Demand Trends */}
            <div className="glass-card p-4 sm:p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex flex-col gap-3 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-white">Market Demand Trends</h3>
                    <p className="text-xs sm:text-sm text-purple-200">Weekly insight into in-demand skills across the platform</p>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/30 w-fit">Unlocked</Badge>
                </div>
              </div>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-xs text-slate-300 mb-1 uppercase tracking-wide">Highest demand</p>
                  <p className="text-white font-semibold">AI &amp; Machine Learning</p>
                  <p className="text-xs text-green-400 mt-2">+18% week over week</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-xs text-slate-300 mb-1 uppercase tracking-wide">Top-paying skill</p>
                  <p className="text-white font-semibold">Senior React Architecture</p>
                  <p className="text-xs text-green-400 mt-2">Average rate: $110/hr</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-xs text-slate-300 mb-1 uppercase tracking-wide">Emerging trend</p>
                  <p className="text-white font-semibold">Generative design automation</p>
                  <p className="text-xs text-blue-400 mt-2">High growth opportunity</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-xs text-slate-300 mb-1 uppercase tracking-wide">Client watchlist</p>
                  <p className="text-white font-semibold">FinTech product revamps</p>
                  <p className="text-xs text-blue-400 mt-2">12 active projects this week</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-white">Support</h3>
                    <p className="text-xs sm:text-sm text-slate-300">{supportLabel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Headphones className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    {supportLevel === 'priority-email' && (
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Priority Email</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10 text-xs sm:text-sm text-slate-300">
                Our support team responds via email. {supportLevel === 'priority-email' ? 'Priority plans receive replies in under 60 minutes.' : 'Expect a response within one business day.'}
              </div>
            </div>
          </div>

          {/* Right Column - Profile and Actions */}
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Profile Completion */}
            <div className="glass-card p-4 sm:p-6 rounded-2xl lg:rounded-3xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-white">Profile Status</h3>
                <div className="p-2 bg-primary/20 rounded-lg">
                  <UserIcon className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 text-sm">Completion</span>
                    <span className="text-white font-semibold">{Math.round(profileCompleteness)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${profileCompleteness}%` }}
                    ></div>
                  </div>
                </div>

                {profileCompleteness < 100 && missingFields && missingFields.length > 0 && (
                  <div className="text-sm text-slate-400">
                    <p className="mb-2 font-medium text-slate-300">Steps remaining ({missingFields.length}):</p>
                    <ul className="space-y-1">
                      {missingFields.slice(0, 5).map((field, index) => (
                        <li key={index} className="flex items-center">
                          <span className="mr-2">•</span> {field}
                        </li>
                      ))}
                      {missingFields.length > 5 && (
                        <li className="flex items-center text-slate-500">
                          <span className="mr-2">•</span> +{missingFields.length - 5} more...
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Publish Profile Toggle */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-white">Profile Visibility</span>
                    </div>
                    <Badge variant={isCurrentlyPublished ? "default" : "secondary"}>
                      {isCurrentlyPublished ? "Published" : "Draft"}
                    </Badge>
                  </div>

                  <p className="text-xs text-white/60 mb-3">
                    {isCurrentlyPublished
                      ? "Your profile is visible to clients"
                      : "Your profile is hidden from clients"}
                  </p>

                  <Button
                    className="w-full mb-3"
                    variant={isCurrentlyPublished ? "outline" : "default"}
                    disabled={(!isProfileComplete && !isCurrentlyPublished) || isPublishing || togglePublishMutation.isPending}
                    onClick={handleTogglePublish}
                  >
                    {isPublishing || togglePublishMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : isCurrentlyPublished ? (
                      <EyeOff className="h-4 w-4 mr-2" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    {isCurrentlyPublished ? "Unpublish Profile" : "Publish Profile"}
                  </Button>

                  {!isProfileComplete && !isCurrentlyPublished && (
                    <p className="text-xs text-yellow-400 flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      Complete your profile (at least 80%) to publish
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <Button asChild className="w-full bg-blue-600 text-white hover:bg-blue-700 font-medium">
                    <Link href="/profile-editor">
                      <UserIcon className="h-4 w-4 mr-2" />
                      Edit Public Profile
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>

                  {(myProfile?.slug || sessionUserId) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full">
                          <Button
                            className="w-full glass-button"
                            disabled={!isProfileComplete}
                            onClick={() => {
                              if (isProfileComplete) {
                                router.push(freelancerProfileLink);
                              }
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Public Profile
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!isProfileComplete && (
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-2">
                            <p className="font-semibold text-sm">Complete your profile to view</p>
                            <p className="text-xs text-muted-foreground">Missing items:</p>
                            <ul className="text-xs space-y-1 list-disc list-inside">
                              {missingFields.slice(0, 5).map((field, i) => (
                                <li key={i}>{field}</li>
                              ))}
                              {missingFields.length > 5 && (
                                <li className="text-muted-foreground">
                                  +{missingFields.length - 5} more...
                                </li>
                              )}
                            </ul>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="glass-card p-4 sm:p-6 rounded-2xl lg:rounded-3xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Verification</h3>
                <div className={`p-2 rounded-lg ${
                  verificationStatus?.status === 'approved'
                    ? 'bg-green-500/20'
                    : verificationStatus?.status === 'pending'
                    ? 'bg-blue-500/20'
                    : verificationStatus?.status === 'rejected'
                    ? 'bg-blue-500/20'
                    : 'bg-yellow-500/20'
                }`}>
                  {verificationStatus?.status === 'approved' ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : verificationStatus?.status === 'pending' ? (
                    <Clock className="h-5 w-5 text-blue-400" />
                  ) : verificationStatus?.status === 'rejected' ? (
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {verificationLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-white/10 rounded animate-pulse" />
                    <div className="h-3 bg-white/5 rounded animate-pulse" />
                  </div>
                ) : verificationStatus?.status === 'approved' ? (
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Star className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Identity Verified</p>
                      <p className="text-green-400 text-sm">Account confirmed</p>
                    </div>
                  </div>
                ) : verificationStatus?.status === 'pending' ? (
                  <div className="text-center py-4">
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-white font-medium">Verification Pending</p>
                    <p className="text-slate-400 text-sm">Your ID is under review</p>
                  </div>
                ) : verificationStatus?.status === 'rejected' ? (
                  <div className="text-center py-4">
                    <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-400 mx-auto mb-2" />
                    <p className="text-white font-medium">Verification Rejected</p>
                    <p className="text-slate-400 text-sm">Please resubmit clear documentation</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-white font-medium">Not Verified</p>
                    <p className="text-slate-400 text-sm">Upload your ID to get verified</p>
                  </div>
                )}

                <Button asChild className={`w-full ${
                  verificationStatus?.status === 'approved'
                    ? 'bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30'
                    : verificationStatus?.status === 'pending'
                    ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30'
                    : verificationStatus?.status === 'rejected'
                    ? 'bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30'
                    : 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30'
                }`}>
                  <Link href="/dashboard?tab=verification">
                    {verificationStatus?.status === 'approved'
                      ? 'View Status'
                      : verificationStatus?.status === 'pending'
                      ? 'Check Status'
                      : verificationStatus?.status === 'rejected'
                      ? 'Resubmit Verification'
                      : 'Upload ID for Verification'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );

  const renderMessagesContent = () => {
    const getContactName = (contact: ContactListItem) => {
      if (contact.profile?.firstName && contact.profile?.lastName) {
        return `${contact.profile.firstName} ${contact.profile.lastName}`;
      }
      return contact.email || 'Unknown User';
    };

    return (
      <div className="space-y-6">
        <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-white/5 border border-white/10">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Messages</h2>

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-auto lg:h-[600px]">
            {/* Contacts List */}
            <div className={`w-full lg:w-1/3 lg:border-r border-white/10 lg:pr-6 overflow-y-auto ${selectedContact ? 'hidden lg:block' : 'block'}`}>
              <h3 className="text-lg font-semibold text-white mb-4">Contacts</h3>
              <div className="space-y-2">
                {contacts?.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                      selectedContact?.id === contact.id
                        ? 'bg-primary/20 border border-primary/30 shadow-lg'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-primary/50">
                        <AvatarImage
                          src={getProfilePictureUrl(contact.id, contact.profile?.profilePicture) || undefined}
                          alt={getContactName(contact)}
                        />
                        <AvatarFallback className="bg-primary/30 text-white font-bold">
                          {contact.profile?.firstName?.charAt(0) || contact.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {getContactName(contact)}
                        </p>
                        {contact.profile?.companyName && (
                          <p className="text-xs text-slate-400 truncate">
                            {contact.profile.companyName}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {(!contacts || contacts.length === 0) && (
                  <div className="text-center py-12">
                    <UserIcon className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400">No contacts yet</p>
                  </div>
                )}
              </div>
            </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${selectedContact ? 'block' : 'hidden lg:flex'}`}>
            {selectedContact ? (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedContact(null)}
                      className="lg:hidden text-white hover:bg-white/10"
                    >
                      ← Back
                    </Button>
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/50">
                      <AvatarImage
                        src={getProfilePictureUrl(selectedContact.id, selectedContact.profile?.profilePicture) || undefined}
                        alt={getContactName(selectedContact)}
                      />
                      <AvatarFallback className="bg-primary/30 text-white font-bold">
                        {selectedContact.profile?.firstName?.charAt(0) || selectedContact.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-white">
                        {getContactName(selectedContact)}
                      </h3>
                      {selectedContact.profile?.companyName && (
                        <p className="text-xs sm:text-sm text-slate-400">
                          {selectedContact.profile.companyName}
                        </p>
                      )}
                      {messages && messages.length > 0 && messages[0].job && (
                        <p className="text-xs sm:text-sm text-slate-400 mt-1">
                          From: {messages[0].job.title}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/10">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
                      <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer">
                        Delete conversation
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer">
                        Block user
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer">
                        Report user
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
                  {messages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.senderId === selectedContact.id ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] p-4 rounded-2xl ${
                          msg.senderId === selectedContact.id
                            ? 'bg-white/10 text-white'
                            : 'bg-primary text-white'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-2">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!messages || messages.length === 0) && (
                    <div className="text-center py-16">
                      <MessageSquare className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-400 text-lg">No messages yet</p>
                      <p className="text-slate-500 text-sm mt-2">Start the conversation!</p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3">
                  <Input
                    id="freelancer-message-input"
                    name="freelancer-message-input"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-slate-400 h-10 sm:h-12 text-sm"
                  />
                  <Button
                    type="submit"
                    disabled={sendMessageMutation.isPending || !messageText.trim()}
                    className="bg-primary hover:bg-primary/90 h-10 sm:h-12 px-4 sm:px-6"
                  >
                    <Send className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-20 w-20 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-300 text-lg font-medium">Select a contact to start messaging</p>
                  <p className="text-slate-500 text-sm mt-2">Choose from your contacts on the left</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    );
  };

  // Render based on view
  const renderViewContent = () => {
    switch (view) {
      case 'messages':
        return renderMessagesContent();

      case 'proposals':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-white/5 border border-white/10">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">My Proposals</h2>
              {proposalsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : proposals && proposals.length > 0 ? (
                <DataTable
                  columns={proposalColumns}
                  data={proposals.map(p => ({
                    ...p,
                    createdAt: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt.toISOString(),
                    updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : p.updatedAt.toISOString()
                  } as ProposalWithJob))}
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg mb-2">No proposals yet</p>
                  <p className="text-slate-500 text-sm">Start applying for jobs to see your proposals here</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'gallery':
        return <GalleryView />;

      case 'profile':
        return <ProfileView />;

      case 'verification':
        return <ClientVerificationWizard />;

      case 'subscription':
        return <SubscriptionView />;

      case 'settings':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-white/5 border border-white/10">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Settings</h2>
              <Tabs defaultValue="account" className="w-full">
                <TabsList>
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>
                <TabsContent value="account">
                  <AccountSettings />
                </TabsContent>
                <TabsContent value="security">
                  <SecuritySettings />
                </TabsContent>
                <TabsContent value="notifications">
                  <NotificationsSettings />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        );

      case 'dashboard':
      default:
        return renderDashboardContent();
    }
  };

  return (
    <TooltipProvider>
      {/* Modals - Available in all views */}
      {selectedProposal && (
        <EditProposalModal
          proposal={{
            id: selectedProposal.id,
            aiAnalysis: null,
            aiScore: null,
            createdAt: new Date(selectedProposal.createdAt).toISOString(),
            updatedAt: new Date(selectedProposal.updatedAt).toISOString(),
            status: selectedProposal.status,
            jobId: selectedProposal.jobId,
            coverLetter: selectedProposal.coverLetter,
            proposedRate: selectedProposal.proposedRate,
            screeningAnswers: null,
            freelancerId: selectedProposal.freelancerId,
            tokenBid: selectedProposal.tokenBid ?? 0,
            deletedAt: null,
            chat_enabled: false,
          }}
          isOpen={isEditModalOpen}
          onClose={() => setEditModalOpen(false)}
        />
      )}
      <AlertDialog
        open={isWithdrawAlertOpen}
        onOpenChange={setWithdrawAlertOpen}
      >
        <AlertDialogContent className="glass-card bg-slate-900/90 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently withdraw your proposal. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdrawConfirm}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Content */}
      {renderViewContent()}
    </TooltipProvider>
  );
}
