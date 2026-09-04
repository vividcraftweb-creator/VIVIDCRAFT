'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth as useSession } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, User, Briefcase, GraduationCap, FolderOpen, Award, Eye, ArrowLeft } from 'lucide-react';
import BasicInfoCard from '@/components/profile-editor/BasicInfoCard';
import EducationCard from '@/components/profile-editor/EducationCard';
import ExperienceCard from '@/components/profile-editor/ExperienceCard';
import PortfolioCard from '@/components/profile-editor/PortfolioCard';
import CertificationCard from '@/components/profile-editor/CertificationCard';
import { createClient } from '@/lib/supabase/client';
import {
  calculateBasicInfoStrength,
  calculateExperienceStrength,
  calculateEducationStrength,
  calculatePortfolioStrength,
  calculateCertificationStrength,
} from '@/lib/profile-editor-helpers';

const STEPS = [
  { id: 1, title: 'Basic Info', icon: User, description: 'Tell us about yourself' },
  { id: 2, title: 'Experience (Optional)', icon: Briefcase, description: 'Your work history' },
  { id: 3, title: 'Education & Qualifications (Optional)', icon: GraduationCap, description: 'Your qualifications' },
  // Portfolio step hidden - code preserved
  // { id: 4, title: 'Portfolio', icon: FolderOpen, description: 'Showcase your work' },
  { id: 4, title: 'Certifications (Optional)', icon: Award, description: 'Professional credentials' },
];

export default function ProfileEditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Google Maps script is loaded by BasicInfoCard component

  const sessionUserId = session?.session?.user?.id;

  // Fetch full profile with all sections
  const profileQuery = trpc.publicProfile.getMyFullProfile.useQuery(undefined, {
    enabled: !!session?.session?.user,
    retry: false,
  });

  // Fetch profile completeness
  const completenessQuery = trpc.publicProfile.getCompleteness.useQuery(undefined, {
    enabled: !!session?.session?.user,
    retry: false,
  });

  // Memoized effective profile combining query data and session data
  const effectiveProfile = useMemo(() => {
    const user = session?.session?.user;
    const fromQuery = profileQuery.data;

    let fName = fromQuery?.firstName || fromQuery?.first_name || (typeof user?.name === 'string' ? user.name.split(' ')[0] : '') || '';
    let lName = fromQuery?.lastName || fromQuery?.last_name || (typeof user?.name === 'string' ? user.name.split(' ').slice(1).join(' ') : '') || '';
    const emailVal = fromQuery?.email || user?.email || '';

    // Special studio One safeguard
    if (
      fName.toLowerCase().includes('studio1') ||
      emailVal.toLowerCase().includes('studio1.foreignbusiness') ||
      (fName.toLowerCase().startsWith('studio') && (!lName || lName.toLowerCase() === 'one'))
    ) {
      fName = 'studio';
      lName = 'One';
    }

    return {
      ...(fromQuery || {}),
      id: fromQuery?.id || user?.id || 'temp-id',
      userId: fromQuery?.userId || user?.id || 'temp-id',
      firstName: fName,
      lastName: lName,
      first_name: fName,
      last_name: lName,
      email: emailVal,
      title: fromQuery?.title || '',
      bio: fromQuery?.bio || '',
      location: fromQuery?.location || fromQuery?.address || '',
      address: fromQuery?.address || fromQuery?.location || '',
      skills: fromQuery?.skills || '',
      profilePicture: fromQuery?.profilePicture || fromQuery?.avatar_url || user?.image || '',
      avatar_url: fromQuery?.avatar_url || fromQuery?.profilePicture || user?.image || '',
      role: 'artist',
      isPublished: fromQuery?.isPublished ?? true,
      educationItems: fromQuery?.educationItems || [],
      experienceItems: fromQuery?.experienceItems || [],
      portfolioItems: fromQuery?.portfolioItems || [],
      certifications: fromQuery?.certifications || [],
    };
  }, [profileQuery.data, session?.session?.user]);

  // Re-fetch latest data on component mount directly from Supabase and sync role safeguard
  useEffect(() => {
    async function loadDirectProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          let dbProfile: any = null;
          try {
            const { data } = await (supabase as any)
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            dbProfile = data;
          } catch {}

          if (!dbProfile) {
            try {
              const { data } = await (supabase as any)
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
              dbProfile = data;
            } catch {}
          }

          const userMetaRole = user.user_metadata?.role || user.app_metadata?.role || 'artist';
          if (!dbProfile?.role || dbProfile.role === 'freelancer' || dbProfile.role === 'FREELANCER') {
            await (supabase as any)
              .from('profiles')
              .update({ role: userMetaRole })
              .eq('id', user.id)
              .catch(() => {});
          }

          profileQuery.refetch();
          completenessQuery.refetch();
        }
      } catch (err) {
        console.warn('Profile mount load notice:', err);
      }
    }
    loadDirectProfile();
  }, []);

  const handleUpdate = () => {
    profileQuery.refetch();
    completenessQuery.refetch();
    router.refresh();
  };

  const publicProfileUrl = effectiveProfile?.slug
    ? `/freelancers/${effectiveProfile.slug}`
    : '/freelancers';

  const utils = trpc.useUtils();

  // Publish mutation
  const togglePublishMutation = trpc.publicProfile.togglePublish.useMutation({
    onSuccess: () => {
      profileQuery.refetch();
      utils.profiles.searchFreelancers.invalidate();
      utils.profiles.getMyProfile.invalidate();
      router.refresh();
      toast.success('Profile published successfully!');
      // Redirect to public profile after successful publish
      setTimeout(() => {
        router.push(publicProfileUrl);
      }, 1000);
    },
    onError: (error) => {
      toast.error('Failed to publish profile', {
        description: error.message,
      });
    },
  });

  const handlePublishToggle = async () => {
    // Only basic info is required before allowing publish
    if (effectiveProfile) {
      const p = effectiveProfile as any;
      const hasName = !!(p.firstName || p.lastName || p.first_name || p.last_name || p.fullName);
      const hasTitle = !!p.title;
      if (!hasName || !hasTitle) {
        toast.error('Profile incomplete', {
          description: 'Please complete your Basic Information (Name & Title) before publishing.',
        });
        return;
      }
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase as any)
          .from('profiles')
          .update({
            is_published: true,
            status: 'published',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
    } catch {}

    // Always publish (set to true)
    togglePublishMutation.mutate({ isPublished: true });
    router.refresh();
  };

  // Calculate section strength based on current step
  const getSectionStrength = (step: number) => {
    if (!effectiveProfile) return null;

    switch (step) {
      case 1:
        return calculateBasicInfoStrength(effectiveProfile as any);
      case 2:
        return calculateExperienceStrength(effectiveProfile.experienceItems as any);
      case 3:
        return calculateEducationStrength(effectiveProfile.educationItems as any);
      case 4:
        return calculateCertificationStrength(effectiveProfile.certifications as any);
      default:
        return null;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Show loading state while authentication is being determined
  if (status === 'loading') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="glass-card p-8 rounded-3xl">
          <div className="text-lg">Loading your profile...</div>
        </div>
      </div>
    );
  }

  // Check authentication after loading is complete
  if (status === 'unauthenticated' || !session?.session?.user) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4">
        <div className="glass-card p-8 rounded-3xl text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-chart-4 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please sign in to access the profile editor.</p>
          <Button 
            onClick={() => router.push('/auth/signin')}
            className="mt-4 glass-button hover-lift"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }


  const completeness = completenessQuery.data || { percentage: 0, missingFields: [], completed: 0, total: 10 };
  const isPublished = effectiveProfile?.isPublished ?? false;
  const currentStepData = STEPS[currentStep - 1];

  return (
    <div className="min-h-screen gradient-mesh">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" />
          <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full bg-chart-1/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full bg-chart-2/8 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
        </div>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <div className="mb-6">
            <Button
              onClick={() => router.push('/dashboard')}
              variant="ghost"
              size="sm"
              className="glass-button hover-lift"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 text-gradient">
              Build Your Profile
            </h1>
            <p className="text-muted-foreground text-lg">Stand out to art collectors with a complete professional profile</p>
          </div>

          {/* Step Indicators - Modern Timeline */}
          <div className="mb-8 overflow-x-auto scrollbar-hide">
            <div className="flex items-center min-w-max px-2 pb-2">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;

                return (
                  <React.Fragment key={`step-${step.id}`}>
                    <button
                      onClick={() => setCurrentStep(step.id)}
                      className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 group ${
                        isActive
                          ? 'glass-card scale-105'
                          : 'hover:glass-card'
                      }`}
                    >
                      <div
                        className={`relative p-3 rounded-xl transition-all duration-300 ${
                          isActive
                            ? 'bg-primary shadow-lg shadow-primary/20'
                            : isCompleted
                            ? 'bg-chart-2/20 border border-chart-2/50'
                            : 'bg-muted/50'
                        }`}
                      >
                        {isCompleted && (
                          <CheckCircle2 className="absolute -top-1 -right-1 h-4 w-4 text-chart-2 bg-background rounded-full" />
                        )}
                        <Icon className={`h-6 w-6 transition-colors ${isActive ? 'text-white' : isCompleted ? 'text-chart-2' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="text-center">
                        <span className={`text-sm font-medium whitespace-nowrap block transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                          {step.title}
                        </span>
                        <span className={`text-xs hidden sm:block ${isActive ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                          {step.description}
                        </span>
                      </div>
                    </button>
                    {index < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${
                        isCompleted ? 'bg-chart-2/50' : 'bg-border'
                      }`} style={{ minWidth: '40px', maxWidth: '80px' }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Current Step Content */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl mb-6 hover-lift">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">{currentStepData.title}</h2>
                <p className="text-muted-foreground">{currentStepData.description}</p>
              </div>

              {/* Section Strength Badge - Hidden on mobile */}
              {getSectionStrength(currentStep) && (
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">Section Strength</span>
                  <Badge
                    className={
                      getSectionStrength(currentStep)!.label === 'Strong'
                        ? 'bg-chart-2/20 text-chart-2 border-chart-2/50'
                        : getSectionStrength(currentStep)!.label === 'Good'
                        ? 'bg-amber-500/20 text-amber-500 border-amber-500/50'
                        : 'bg-muted/20 text-muted-foreground border-muted/50'
                    }
                  >
                    {getSectionStrength(currentStep)!.label}
                  </Badge>
                </div>
              )}
            </div>

            <div className="min-h-[400px]">
              {currentStep === 1 && (
                <BasicInfoCard profile={effectiveProfile as any} onUpdate={handleUpdate} />
              )}
              {currentStep === 2 && (
                <ExperienceCard
                  items={effectiveProfile.experienceItems || []}
                  onUpdate={handleUpdate}
                />
              )}
              {currentStep === 3 && (
                <EducationCard
                  items={effectiveProfile.educationItems || []}
                  onUpdate={handleUpdate}
                />
              )}
              {/* Portfolio step hidden - code preserved */}
              {/* {currentStep === 999 && (
                <PortfolioCard
                  items={effectiveProfile.portfolioItems || []}
                  onUpdate={handleUpdate}
                />
              )} */}
              {currentStep === 4 && (
                <CertificationCard
                  items={effectiveProfile.certifications || []}
                  onUpdate={handleUpdate}
                />
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              variant="outline"
              size="lg"
              className="glass-button hover-lift interactive-scale w-full sm:w-auto"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Previous
            </Button>

            <Button
              onClick={currentStep === STEPS.length ? handlePublishToggle : handleNext}
              disabled={currentStep === STEPS.length ? togglePublishMutation.isPending : false}
              size="lg"
              className="glass-button hover-lift interactive-scale w-full sm:w-auto"
            >
              {currentStep === STEPS.length ? (
                togglePublishMutation.isPending ? (
                  'Publishing...'
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Publish Profile
                  </>
                )
              ) : (
                <>
                  Next
                  <ChevronRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
