'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, Clock, Repeat, Zap, Check } from 'lucide-react';
import type { JobFormData } from '../CreateJobWizard';
import { JOB_CATEGORIES } from '@/constants/job-taxonomy';

const JOB_TYPES = [
  { value: 'short_term', label: 'Short-term', description: 'One-time project (1-3 months)', icon: Zap },
  { value: 'long_term', label: 'Long-term', description: 'Ongoing collaboration (3+ months)', icon: Repeat },
  { value: 'one_time', label: 'One-time Task', description: 'Quick task or gig', icon: Clock },
  { value: 'ongoing', label: 'Ongoing Support', description: 'Continuous support needed', icon: Briefcase },
];

interface Props {
  formData: JobFormData;
  updateFormData: (data: Partial<JobFormData>) => void;
}

export default function Step1ProjectType({ formData, updateFormData }: Props) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Message */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Let&apos;s find you the perfect talent</h2>
        <p className="text-muted-foreground">Tell us about your project, step by step</p>
      </div>

      {/* Project Goal */}
      <div className="space-y-3">
        <Label htmlFor="project_goal" className="text-lg font-medium">
          What&apos;s your project goal? <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="project_goal"
          value={formData.project_goal}
          onChange={(e) => updateFormData({ project_goal: e.target.value })}
          placeholder="e.g., Build a marketing website, Redesign our mobile app, Create social media content..."
          rows={3}
          className="text-base"
        />
        <p className="text-xs text-muted-foreground">This helps us suggest the right freelancers</p>
      </div>

      {/* Job Type */}
      <div className="space-y-3">
        <Label className="text-lg font-medium">
          Project Type <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {JOB_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = formData.job_type === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => updateFormData({ job_type: type.value as JobFormData['job_type'] })}
                className={`glass-card p-5 rounded-xl text-left transition-all duration-300 hover:scale-105 hover:shadow-lg relative ${
                  isSelected
                    ? 'border-2 border-primary bg-gradient-to-br from-primary/20 to-primary/5 shadow-primary/20'
                    : 'border border-white/10 hover:border-primary/50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-primary rounded-full p-1">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-lg transition-colors ${
                    isSelected ? 'bg-primary/20' : 'bg-primary/10'
                  }`}>
                    <Icon className={`h-6 w-6 transition-colors ${
                      isSelected ? 'text-primary' : 'text-primary/70'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold text-base mb-1 transition-colors ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}>{type.label}</div>
                    <div className="text-sm text-muted-foreground">{type.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-3">
        <Label className="text-lg font-medium">
          Category <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {JOB_CATEGORIES.map((category) => {
            const isSelected = formData.category === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => updateFormData({ category })}
                className={`glass-card px-5 py-4 rounded-xl text-left transition-all duration-300 hover:scale-105 relative ${
                  isSelected
                    ? 'border-2 border-primary bg-gradient-to-br from-primary/20 to-primary/5 text-foreground shadow-primary/20'
                    : 'border border-white/10 text-muted-foreground hover:text-foreground hover:border-primary/50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-primary rounded-full p-1">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                <div className={`font-medium transition-colors ${
                  isSelected ? 'text-primary' : ''
                }`}>
                  {category}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
