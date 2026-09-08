'use client';

import { useAuth as useSession } from '@/hooks/useAuth';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin,
  DollarSign,
  Briefcase,
  Edit,
  CheckCircle,
  Mail,
  Star,
  Award,
  GraduationCap,
  Calendar,
  Globe,
  FileText,
  Clock,
  ExternalLink,
  Target,
  Phone,
  Building2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PlanBadge } from '@/components/shared/FeaturedBadge';
import { getProfilePictureUrl } from '@/lib/profile-helpers';

export default function ProfileView() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { data: profile, isLoading } = trpc.profiles.getMyProfile.useQuery({}, {
    enabled: status === 'authenticated' && !!session?.session?.user,
    retry: false,
  });

  const { data: verification } = trpc.verifications.getVerificationStatus.useQuery(undefined, {
    enabled: status === 'authenticated' && !!session?.session?.user,
    retry: false,
  });
  const { data: planSummary } = trpc.user.getPlanFeatures.useQuery(undefined, {
    enabled: status === 'authenticated' && !!session?.session?.user,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const sessionUser = session?.session?.user as any;

  const fName = profile?.firstName || (profile as any)?.first_name || sessionUser?.user_metadata?.firstName || sessionUser?.user_metadata?.first_name || '';
  const lName = profile?.lastName || (profile as any)?.last_name || sessionUser?.user_metadata?.lastName || sessionUser?.user_metadata?.last_name || '';

  const sessionInitials = sessionUser?.user_metadata?.firstName && sessionUser?.user_metadata?.lastName
    ? `${sessionUser.user_metadata.firstName[0]}${sessionUser.user_metadata.lastName[0]}`.toUpperCase()
    : sessionUser?.name
    ? sessionUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : sessionUser?.email?.[0]?.toUpperCase() || 'U';

  const profileInitials = (fName || lName)
    ? `${fName?.[0] ?? ''}${lName?.[0] ?? ''}`.toUpperCase()
    : sessionInitials;

  const rawAvatar =
    profile?.profilePicture ||
    (profile as any)?.avatar_url ||
    (profile as any)?.profile_picture ||
    (profile as any)?.avatar ||
    (profile as any)?.image ||
    (sessionUser as any)?.user_metadata?.avatar_url ||
    (sessionUser as any)?.user_metadata?.picture ||
    sessionUser?.image;

  const avatarSrc = (rawAvatar ? getProfilePictureUrl(profile?.userId || (profile as any)?.id || sessionUser?.id, rawAvatar) : undefined)
    || (sessionUser as any)?.user_metadata?.avatar_url
    || (sessionUser as any)?.user_metadata?.picture
    || sessionUser?.image
    || undefined;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Match actual header structure */}
        <div className="bg-slate-900/80 rounded-3xl border border-slate-800 overflow-hidden">
          {/* Header Background - matches line 147 height */}
          <div className="h-32 relative">
            <div className="absolute top-4 right-4">
              <Skeleton className="h-9 w-32" /> {/* Edit button */}
            </div>
          </div>

          {/* Profile Content - matches line 169 structure */}
          <div className="px-6 sm:px-10 pb-8 -mt-24 relative z-10">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              {/* Avatar - matches line 173 - 128px */}
              <Skeleton className="h-32 w-32 rounded-full border-4 border-gray-950 flex-shrink-0" />

              {/* Name and details */}
              <div className="flex-1 min-w-0 space-y-3">
                <Skeleton className="h-10 w-64" /> {/* Name */}
                <Skeleton className="h-6 w-48" /> {/* Title */}
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-32" /> {/* Location */}
                  <Skeleton className="h-4 w-40" /> {/* Email */}
                </div>
                {/* Badge area - reserve space to prevent shift */}
                <div className="flex gap-2 mt-4" style={{ minHeight: '28px' }}>
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-7 w-24" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional content skeletons */}
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // Parse experience and education as they might be JSON strings or plain strings from signup
  const parseExperience = () => {
    if (!profile?.experience) return [];

    // If it's already a string (from signup), wrap in array format
    if (typeof profile.experience === 'string') {
      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(profile.experience);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // If not JSON, treat as plain string (from signup)
        return profile.experience.trim()
          ? [{ description: profile.experience, title: 'Experience' }]
          : [];
      }
    }

    return [];
  };

  const parseEducation = () => {
    if (!profile?.education) return [];

    if (typeof profile.education === 'string') {
      try {
        const parsed = JSON.parse(profile.education);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // If not JSON, treat as plain string
        return profile.education.trim()
          ? [{ description: profile.education, degree: 'Education' }]
          : [];
      }
    }

    return [];
  };

  const experiences = parseExperience();
  const education = parseEducation();
  const skills = Array.isArray(profile?.skills)
    ? profile.skills
    : typeof profile?.skills === 'string'
    ? profile.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  // Format plan name for display
  const formatPlanName = (plan: string) => {
    // Convert plan names like 'FREELANCER_FREE', 'CLIENT_PRO', etc to readable format
    const planMap: Record<string, string> = {
      'free': 'Free Plan',
      'FREELANCER_FREE': 'Free Plan',
      'CLIENT_FREE': 'Free Plan',
      'FREELANCER_PRO': 'Pro Plan',
      'CLIENT_PRO': 'Pro Plan',
      'FREELANCER_ELITE': 'Elite Plan',
      'CLIENT_BUSINESS': 'Business Plan',
      'CLIENT_ENTERPRISE': 'Enterprise Plan'
    };

    return planMap[plan] || plan.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Check if plan is truly premium (not free)
  const isPremiumPlan = (plan: string) => {
    const freePlans = ['free', 'FREE', 'FREELANCER_FREE', 'CLIENT_FREE'];
    return !freePlans.includes(plan);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto contain-layout">
      {/* Resume Header - Top Section */}
      <div className="bg-slate-900/80 rounded-3xl border border-slate-800 overflow-hidden shadow-sm">
        {/* Header Background */}
        <div className="h-32 relative">
          {/* Edit Button - Absolute positioned */}
          <div className="absolute top-4 right-4">
            <Button
              onClick={() => {
                // CLIENT users edit in dashboard, FREELANCER users use profile editor
                if (sessionUser?.role === 'CLIENT') {
                  router.push('/dashboard?tab=profile&mode=edit');
                } else {
                  router.push('/profile-editor');
                }
              }}
              className="bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 text-white shadow-lg"
              size="sm"
            >
              <Edit className="h-3.5 w-3.5 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Profile Header Content */}
        <div className="px-6 sm:px-10 pb-8 -mt-24 relative z-10">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar className="h-32 w-32 border-4 border-gray-950 shadow-xl">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback className="bg-primary text-white text-4xl font-bold">
                  {profileInitials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 w-10 h-10">
                {verification?.status === 'APPROVED' && (
                  <div className="bg-green-500 rounded-full p-2 border-4 border-gray-950 shadow-lg w-full h-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Name and Title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 tracking-tight">
                {(fName || lName)
                  ? `${fName} ${lName}`.trim()
                  : sessionUser?.user_metadata?.firstName && sessionUser?.user_metadata?.lastName
                  ? `${sessionUser.user_metadata.firstName} ${sessionUser.user_metadata.lastName}`
                  : (profile as any)?.full_name || sessionUser?.name || 'Complete Your Profile'}
              </h1>

              {profile?.title && (
                <p className="text-xl text-primary font-medium mb-3 flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  {profile.title}
                </p>
              )}

              {/* Quick Info Row */}
              <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                {profile?.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{profile.location}</span>
                  </div>
                )}

                {sessionUser?.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{sessionUser.email}</span>
                  </div>
                )}

                {profile?.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{profile.phone}</span>
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-4" style={{ minHeight: '28px' }}>
                {planSummary?.plan && (
                  <PlanBadge plan={planSummary.plan as any} />
                )}
                {verification?.status === 'APPROVED' && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  {sessionUser?.role || 'FREELANCER'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Summary */}
      {profile?.bio && (
        <div className="bg-slate-900/80 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white">Professional Summary</h2>
          </div>
          <p className="text-slate-300 leading-relaxed text-base whitespace-pre-line">
            {profile.bio}
          </p>
        </div>
      )}

      {/* Company Info - For CLIENT users */}
      {profile?.companyInfo && sessionUser?.role === 'CLIENT' && (
        <div className="bg-slate-900/80 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Company Info</h2>
          </div>
          <p className="text-slate-300 leading-relaxed text-base whitespace-pre-line">
            {profile.companyInfo}
          </p>
        </div>
      )}

      {/* CLIENT-SPECIFIC LAYOUT */}
      {sessionUser?.role === 'CLIENT' ? (
        <>
          {/* Company Details Grid - 2x2 Layout */}
          {(profile?.industry || profile?.country || profile?.timezone || profile?.website) && (
            <div className="bg-slate-900/80 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Briefcase className="h-5 w-5 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Company Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Industry Card */}
                {profile?.industry && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6 hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-4 w-4 text-cyan-400" />
                      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Industry</h3>
                    </div>
                    <p className="text-lg font-semibold text-white">{profile.industry}</p>
                  </div>
                )}

                {/* Country Card */}
                {profile?.country && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6 hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-blue-400" />
                      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Country</h3>
                    </div>
                    <p className="text-lg font-semibold text-white">{profile.country}</p>
                  </div>
                )}

                {/* Timezone Card */}
                {profile?.timezone && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6 hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-purple-400" />
                      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Timezone</h3>
                    </div>
                    <p className="text-lg font-semibold text-white">{profile.timezone}</p>
                  </div>
                )}

                {/* Website Card */}
                {profile?.website && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6 hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-green-400" />
                      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Website</h3>
                    </div>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-2 break-all"
                    >
                      {profile.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

        </>
      ) : (
        /* FREELANCER LAYOUT - Keep existing two-column grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skills & Expertise */}
            {skills.length > 0 && (
              <div className="bg-slate-900/80 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Star className="h-5 w-5 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Skills & Expertise</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill: string, index: number) => (
                    <Badge
                      key={index}
                      className="bg-primary/20 text-white border-primary/30 px-4 py-2 text-sm hover:bg-primary/30 transition-all"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {education.length > 0 && (
              <div className="bg-slate-900/80 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Education</h2>
                </div>

                <div className="space-y-4">
                  {education.map((edu: any, index: number) => (
                    <div key={index} className="bg-slate-950/60 rounded-xl p-5 border border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-white">{edu.degree}</h3>
                          <p className="text-green-400 font-medium">{edu.institution || edu.school}</p>
                        </div>
                        {edu.year && (
                          <div className="flex items-center gap-1.5 text-sm text-slate-400">
                            <Calendar className="h-4 w-4" />
                            <span>{edu.year}</span>
                          </div>
                        )}
                      </div>
                      {edu.description && (
                        <p className="text-slate-300 text-sm mt-2">{edu.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Rate & Availability */}
            {profile?.rate && (
              <div className="bg-slate-900/80 p-6 rounded-2xl border border-green-500/30 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Hourly Rate</h3>
                </div>
                <div className="text-center py-4">
                  <p className="text-5xl font-bold text-white mb-2">
                    ${profile.rate.toFixed(0)}
                    <span className="text-2xl text-slate-400 font-normal">/hr</span>
                  </p>
                  <p className="text-sm text-green-400 flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" />
                    Available for hire
                  </p>
                </div>
              </div>
            )}

            {/* Portfolio & Links */}
            {profile?.portfolio && (
              <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Globe className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Portfolio</h3>
                </div>
                <a
                  href={profile.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors break-all"
                >
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{profile.portfolio}</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State - Only for FREELANCER users */}
      {!profile?.firstName && !profile?.lastName && sessionUser?.role !== 'CLIENT' && (
        <div className="bg-slate-900/80 p-8 rounded-3xl border border-primary/30 text-center shadow-sm">
          <div className="max-w-md mx-auto">
            <div className="inline-flex p-6 bg-primary/20 rounded-full mb-6 shadow-lg shadow-primary/10">
              <Edit className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Build Your Professional Resume</h3>
            <p className="text-slate-300 mb-6 leading-relaxed">
              Create a comprehensive profile that showcases your skills, experience, and expertise. Stand out to clients and increase your chances of getting hired!
            </p>
            <Button
              onClick={() => router.push('/profile-editor')}
              className="bg-blue-600 hover:bg-blue-700 font-semibold shadow-lg shadow-blue-500/25"
              size="lg"
            >
              <Edit className="h-5 w-5 mr-2" />
              Start Building
            </Button>
          </div>
        </div>
      )}

      {/* Empty State - For CLIENT users */}
      {!profile?.firstName && !profile?.lastName && sessionUser?.role === 'CLIENT' && (
        <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 text-center shadow-sm">
          <div className="max-w-md mx-auto">
            <div className="inline-flex p-6 bg-blue-500/20 rounded-full mb-6">
              <Edit className="h-16 w-16 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Complete Your Profile</h3>
            <p className="text-slate-300 mb-6 leading-relaxed">
              Add your company information to help freelancers understand your business better and build trust.
            </p>
            <Button
              onClick={() => router.push('/dashboard?tab=profile&mode=edit')}
              className="bg-blue-600 hover:bg-blue-700 font-semibold shadow-lg shadow-blue-500/25"
              size="lg"
            >
              <Edit className="h-5 w-5 mr-2" />
              Complete Profile
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
