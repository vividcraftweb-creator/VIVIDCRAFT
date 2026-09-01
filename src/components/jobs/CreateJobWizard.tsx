'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Briefcase, FileText, Code, DollarSign, Eye, Target,
  Building, Image as ImageIcon, ClipboardList, Settings,
  CheckCircle2, ChevronLeft, ChevronRight, ArrowLeft,
  Sparkles, FileCheck, Send
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { analytics } from '@/utils/analytics';

// Import all step components
import Step1ProjectType from './steps/Step1ProjectType';
import Step2Title from './steps/Step2Title';
import Step3Skills from './steps/Step3Skills';
import Step4Payment from './steps/Step4Payment';
import Step5Review from './steps/Step5Review';
import Step6ProjectScope from './steps/Step6ProjectScope';
import Step7CompanyDetails from './steps/Step7CompanyDetails';
import Step8MediaUpload from './steps/Step8MediaUpload';
import Step9ScreeningQuestions from './steps/Step9ScreeningQuestions';
import Step10Preferences from './steps/Step10Preferences';

export interface JobFormData {
  // Project basics
  project_goal: string;
  job_type: 'short_term' | 'long_term' | 'one_time' | 'ongoing' | '';
  category: string;

  // Core info
  title: string;
  description: string;
  skills: string[];

  // Scope
  experience_level: 'Entry' | 'Intermediate' | 'Expert' | '';
  project_size: 'Small' | 'Medium' | 'Large' | '';
  project_duration: string;

  // Payment
  payment_type: 'hourly' | 'fixed_price' | '';
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  budget_amount?: number;
  milestones?: Array<{ name: string; amount: number }>;

  // Company
  company_name: string;
  company_website?: string;
  company_location: string;
  company_lat?: number;
  company_lng?: number;
  location_visibility: 'public' | 'hidden';

  // Media
  company_logo?: string;
  job_thumbnail?: string;
  supporting_images: string[];
  project_files: string[];

  // Screening
  screening_questions: string[];
  auto_screening: boolean;

  // Preferences
  english_level?: string;
  preferred_locations: string[];
  project_stage?: string;
  availability_requirement?: string;
  application_deadline?: string;
}

const PHASES = [
  {
    id: 1,
    name: 'Job Basics',
    description: 'Essential information about your job posting',
    icon: Sparkles,
    steps: [1, 2, 3, 4, 5],
  },
  {
    id: 2,
    name: 'Job Details',
    description: 'Additional details and requirements',
    icon: FileCheck,
    steps: [6, 7, 8],
  },
  {
    id: 3,
    name: 'Finalize & Publish',
    description: 'Review and publish your job',
    icon: Send,
    steps: [9, 10, 11],
  },
];

const STEPS = [
  { number: 1, title: 'Project Type', component: Step1ProjectType,
    icon: Briefcase, description: 'Define your project', phase: 1 },
  { number: 2, title: 'Title & Description', component: Step2Title,
    icon: FileText, description: 'Core information', phase: 1 },
  { number: 3, title: 'Skills', component: Step3Skills,
    icon: Code, description: 'Required expertise', phase: 1 },
  { number: 4, title: 'Budget & Payment', component: Step4Payment,
    icon: DollarSign, description: 'Financial details', phase: 1 },
  { number: 5, title: 'Quick Review', component: Step5Review,
    icon: Eye, description: 'Check your basics', phase: 1 },
  { number: 6, title: 'Project Scope', component: Step6ProjectScope,
    icon: Target, description: 'Define scope', phase: 2 },
  { number: 7, title: 'Company Details', component: Step7CompanyDetails,
    icon: Building, description: 'Your company info', phase: 2 },
  { number: 8, title: 'Media Upload', component: Step8MediaUpload,
    icon: ImageIcon, description: 'Visual assets', phase: 2 },
  { number: 9, title: 'Screening Questions', component: Step9ScreeningQuestions,
    icon: ClipboardList, description: 'Filter candidates', phase: 3 },
  { number: 10, title: 'Preferences', component: Step10Preferences,
    icon: Settings, description: 'Final preferences', phase: 3 },
  { number: 11, title: 'Final Review & Publish', component: Step5Review,
    icon: CheckCircle2, description: 'Publish your job', phase: 3 },
];

export default function CreateJobWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<JobFormData>({
    project_goal: '',
    job_type: '',
    category: '',
    title: '',
    description: '',
    skills: [],
    experience_level: '',
    project_size: '',
    project_duration: '',
    payment_type: '',
    company_name: '',
    company_location: '',
    location_visibility: 'public',
    supporting_images: [],
    project_files: [],
    screening_questions: [],
    auto_screening: true,
    preferred_locations: [],
    application_deadline: '',
  });

  // Load saved draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('job_draft');
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        setFormData(parsedDraft);
      } catch (error) {
        // Error parsing draft - ignore
      }
    }
  }, []);

  const createJobMutation = trpc.jobs.createJob.useMutation({
    onSuccess: (job) => {
      toast.success('Job posted successfully!');

      // Track job posted event
      analytics.jobPosted(job.id, job.category || undefined);

      router.push(`/jobs/${job.slug || job.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create job');
    },
  });

  const updateFormData = (updates: Partial<JobFormData>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...updates };
      // Save to localStorage for persistence
      localStorage.setItem('job_draft', JSON.stringify(updated));
      return updated;
    });
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.job_type && formData.category);
      case 2:
        return formData.title.length >= 10 && formData.title.length <= 70 && formData.description.length >= 50;
      case 3:
        return formData.skills.length > 0 && formData.skills.length <= 10;
      case 4: {
        if (!formData.payment_type) {
          return false;
        }

        if (!formData.application_deadline) {
          return false;
        }

        const deadline = new Date(formData.application_deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(deadline.getTime()) || deadline < today) {
          return false;
        }

        if (formData.payment_type === 'fixed_price') {
          return !!(typeof formData.budget_amount === 'number' && formData.budget_amount > 0);
        }

        if (formData.payment_type === 'hourly') {
          const min = formData.hourly_rate_min;
          const max = formData.hourly_rate_max;
          const hasMin = typeof min === 'number' && Number.isFinite(min) && min > 0;
          const hasMax = typeof max === 'number' && Number.isFinite(max) && max > 0;

          if (!hasMin && !hasMax) {
            return false;
          }

          if (hasMin && hasMax && min > max) {
            return false;
          }

          return true;
        }

        return true;
      }
      case 5:
        return true; // Quick review is always valid
      case 6:
        return !!(formData.experience_level && formData.project_size && formData.project_duration);
      case 7:
        return !!(formData.company_name && formData.company_location);
      case 8:
      case 9:
      case 10:
        return true; // Optional steps
      case 11:
        return true; // Final review
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast.error('Please complete all required fields');
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditStep = (step: number) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePublish = async () => {
    // Validate all required fields
    const requiredSteps = [1, 2, 3, 4, 6, 7];
    for (const step of requiredSteps) {
      if (!validateStep(step)) {
        toast.error(`Please complete step ${step}: ${STEPS[step - 1].title}`);
        setCurrentStep(step);
        return;
      }
    }

    try {
      if (!formData.application_deadline) {
        toast.error('Please select an application deadline.');
        setCurrentStep(4);
        return;
      }

      const deadlineDate = new Date(formData.application_deadline);
      if (Number.isNaN(deadlineDate.getTime())) {
        toast.error('Invalid application deadline. Please select a future date.');
        setCurrentStep(4);
        return;
      }
      // Set deadline to end of selected day for clarity
      deadlineDate.setHours(23, 59, 59, 999);

      await createJobMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        tags: formData.skills.join(', '),
        budget: formData.budget_amount
          ?? formData.hourly_rate_min
          ?? formData.hourly_rate_max
          ?? 0,
        deadline: deadlineDate,
        // Extended fields
        jobType: formData.job_type,
        category: formData.category,
        projectGoal: formData.project_goal,
        experienceLevel: formData.experience_level,
        projectSize: formData.project_size,
        projectDuration: formData.project_duration,
        paymentType: formData.payment_type,
        hourlyRateMin: formData.hourly_rate_min,
        hourlyRateMax: formData.hourly_rate_max,
        milestones: formData.milestones,
        companyName: formData.company_name,
        companyWebsite: formData.company_website,
        companyLocation: formData.company_location,
        companyLat: formData.company_lat,
        companyLng: formData.company_lng,
        locationVisibility: formData.location_visibility,
        companyLogo: formData.company_logo,
        jobThumbnail: formData.job_thumbnail,
        supportingImages: formData.supporting_images,
        projectFiles: formData.project_files,
        screeningQuestions: formData.screening_questions,
        autoScreening: formData.auto_screening,
        englishLevel: formData.english_level,
        preferredLocations: formData.preferred_locations,
        projectStage: formData.project_stage,
        availabilityRequirement: formData.availability_requirement,
      });
      // Clear draft from localStorage
      localStorage.removeItem('job_draft');
    } catch (error) {
      // Error handled by mutation onError
    }
  };

  const CurrentStepComponent = STEPS[currentStep - 1].component;

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full bg-chart-1/10 blur-3xl animate-float"
             style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full bg-chart-2/8 blur-3xl animate-float"
             style={{ animationDelay: '4s' }} />
      </div>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 relative z-10 max-w-5xl">
        {/* Back to Dashboard Button */}
        <div className="mb-6">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="glass-button hover-lift"
          >
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 text-foreground">
            Create a Job Posting
          </h1>
          <p className="text-muted-foreground text-lg">
            Find the right talent with our step-by-step wizard
          </p>
        </div>

        {/* Phase Progress Indicators */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PHASES.map((phase, phaseIndex) => {
              const PhaseIcon = phase.icon;
              const currentPhase = STEPS.find(s => s.number === currentStep)?.phase || 1;
              const isActive = phase.id === currentPhase;
              const isCompleted = phase.id < currentPhase;

              // Calculate progress within this phase
              const completedStepsInPhase = phase.steps.filter(stepNum => stepNum < currentStep).length;
              const totalStepsInPhase = phase.steps.length;
              const progressPercent = (completedStepsInPhase / totalStepsInPhase) * 100;

              return (
                <div
                  key={phase.id}
                  className={`glass-card p-4 sm:p-5 rounded-2xl transition-all duration-300 ${
                    isActive ? 'ring-2 ring-primary scale-105' : isCompleted ? 'opacity-75' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'bg-primary shadow-lg shadow-primary/20'
                          : isCompleted
                          ? 'bg-chart-2/20'
                          : 'bg-muted/50'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-chart-2" />
                      ) : (
                        <PhaseIcon
                          className={`h-6 w-6 ${
                            isActive ? 'text-white' : 'text-muted-foreground'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-semibold mb-1 transition-colors ${
                          isActive ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {phase.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {phase.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isCompleted ? 'bg-chart-2' : isActive ? 'bg-primary' : 'bg-muted'
                            }`}
                            style={{ width: `${isCompleted ? 100 : progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          {isCompleted ? totalStepsInPhase : completedStepsInPhase}/{totalStepsInPhase}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Step Indicator */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}: <span className="font-medium text-foreground">{STEPS[currentStep - 1].title}</span>
            </p>
          </div>
        </div>


        {/* Current Step Content */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl mb-6 hover-lift">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {STEPS[currentStep - 1].title}
              </h2>
              <p className="text-muted-foreground">
                {STEPS[currentStep - 1].description}
              </p>
            </div>
          </div>

          <div className="min-h-[400px]">
            <CurrentStepComponent
              formData={formData}
              updateFormData={updateFormData}
              onEditStep={
                currentStep === 5 || currentStep === 11 ? handleEditStep : undefined
              }
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button
            onClick={handleBack}
            disabled={currentStep === 1}
            variant="outline"
            size="lg"
            className="glass-button hover-lift interactive-scale w-full sm:w-auto"
            aria-label="Go to previous step"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Previous
          </Button>

          <Button
            onClick={currentStep === STEPS.length ? handlePublish : handleNext}
            disabled={currentStep === STEPS.length ? createJobMutation.isPending : false}
            size="lg"
            className="bg-primary hover:bg-primary/90 w-full sm:w-auto shadow-lg shadow-primary/20 hover-lift interactive-scale"
            aria-label={
              currentStep === STEPS.length ? 'Publish job' : 'Go to next step'
            }
          >
            {currentStep === STEPS.length ? (
              createJobMutation.isPending ? (
                'Publishing...'
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Publish Job
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
  );
}
