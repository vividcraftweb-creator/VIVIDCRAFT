'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gauge, Users, Clock, Check } from 'lucide-react';
import type { JobFormData } from '../CreateJobWizard';

interface Props {
  formData: JobFormData;
  updateFormData: (data: Partial<JobFormData>) => void;
}

const EXPERIENCE_LEVELS = [
  {
    value: 'Entry',
    label: 'Entry Level',
    description: 'Looking for someone relatively new to this field',
    icon: '🌱',
    hourlyRate: '$10-30/hr',
  },
  {
    value: 'Intermediate',
    label: 'Intermediate',
    description: 'Looking for substantial experience in this field',
    icon: '⚡',
    hourlyRate: '$30-60/hr',
  },
  {
    value: 'Expert',
    label: 'Expert',
    description: 'Looking for comprehensive and deep expertise',
    icon: '🏆',
    hourlyRate: '$60-150+/hr',
  },
];

const PROJECT_SIZES = [
  {
    value: 'Small',
    label: 'Small',
    description: 'Quick and straightforward',
    icon: '📄',
    duration: 'Less than 1 month',
  },
  {
    value: 'Medium',
    label: 'Medium',
    description: 'Well-defined project',
    icon: '📊',
    duration: '1-3 months',
  },
  {
    value: 'Large',
    label: 'Large',
    description: 'Longer engagement',
    icon: '🏢',
    duration: '3-6+ months',
  },
];

export default function Step6ProjectScope({ formData, updateFormData }: Props) {
  const formatDuration = (duration: string) => {
    const formatted = duration.replace(/_/g, ' ');
    // Fix specific patterns like "1 3 months" to "1-3 months"
    return formatted
      .replace(/(\d+)\s+(\d+)\s+(week|month)/g, '$1-$2 $3')
      .replace(/less than/g, 'less than')
      .replace(/more than/g, 'more than');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Define your project scope</h2>
        <p className="text-muted-foreground">
          Help freelancers understand the level of expertise and commitment required
        </p>
      </div>

      {/* Experience Level */}
      <div className="space-y-4">
        <Label className="text-lg font-medium flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          Experience Level <span className="text-destructive">*</span>
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {EXPERIENCE_LEVELS.map((level) => {
            const isSelected = formData.experience_level === level.value;
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => updateFormData({ experience_level: level.value as JobFormData['experience_level'] })}
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
                <div className="text-3xl mb-2">{level.icon}</div>
                <div className={`font-semibold text-lg mb-1 transition-colors ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}>{level.label}</div>
                <div className="text-sm text-muted-foreground">{level.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Project Size */}
      <div className="space-y-4">
        <Label className="text-lg font-medium flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Project Size <span className="text-destructive">*</span>
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PROJECT_SIZES.map((size) => {
            const isSelected = formData.project_size === size.value;
            return (
              <button
                key={size.value}
                type="button"
                onClick={() => updateFormData({ project_size: size.value as JobFormData['project_size'] })}
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
                <div className="text-3xl mb-2">{size.icon}</div>
                <div className={`font-semibold text-lg mb-1 transition-colors ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}>{size.label}</div>
                <div className="text-sm text-muted-foreground">{size.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Project Duration */}
      <div className="space-y-4">
        <Label htmlFor="duration" className="text-lg font-medium flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Expected Project Duration <span className="text-destructive">*</span>
        </Label>

        <Select
          value={formData.project_duration}
          onValueChange={(value) => updateFormData({ project_duration: value })}
        >
          <SelectTrigger id="duration" className="glass-card text-base h-12">
            <SelectValue placeholder="Select expected duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="less_than_1_week">Less than 1 week</SelectItem>
            <SelectItem value="1_2_weeks">1-2 weeks</SelectItem>
            <SelectItem value="2_4_weeks">2-4 weeks</SelectItem>
            <SelectItem value="1_3_months">1-3 months</SelectItem>
            <SelectItem value="3_6_months">3-6 months</SelectItem>
            <SelectItem value="more_than_6_months">More than 6 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* AI Suggestion Card */}
      {formData.experience_level && formData.project_size && formData.project_duration && (
        <div className="glass-card p-6 rounded-xl border-primary/30 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="text-sm">
              <p className="font-medium text-primary mb-2">Scope Summary</p>
              <p className="text-muted-foreground">
                You&apos;re looking for <span className="text-foreground font-medium">{formData.experience_level}</span> level talent
                for a <span className="text-foreground font-medium">{formData.project_size}</span> project
                lasting <span className="text-foreground font-medium">{formatDuration(formData.project_duration)}</span>.
                This will help match you with the right freelancers.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
