'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Globe, MapPin, Calendar, Settings } from 'lucide-react';
import type { JobFormData } from '../CreateJobWizard';

interface Props {
  formData: JobFormData;
  updateFormData: (data: Partial<JobFormData>) => void;
}

const ENGLISH_LEVELS = [
  { value: 'any', label: 'Any Level', description: 'No preference' },
  { value: 'basic', label: 'Basic', description: 'Simple communication' },
  { value: 'conversational', label: 'Conversational', description: 'Can discuss project details' },
  { value: 'fluent', label: 'Fluent', description: 'Native or near-native' },
  { value: 'native', label: 'Native Only', description: 'Native speakers only' },
];

const REGIONS = [
  'North America',
  'South America',
  'Europe',
  'Asia',
  'Africa',
  'Oceania',
  'Middle East',
];

const PROJECT_STAGES = [
  { value: 'idea', label: 'Just an Idea', icon: '💡' },
  { value: 'planning', label: 'Planning Stage', icon: '📋' },
  { value: 'in_progress', label: 'Already Started', icon: '🚧' },
  { value: 'maintenance', label: 'Needs Maintenance', icon: '🔧' },
];

const AVAILABILITY_REQUIREMENTS = [
  { value: 'flexible', label: 'Flexible', description: 'Work at their own pace' },
  { value: 'part_time', label: 'Part-time', description: '10-20 hours/week' },
  { value: 'full_time', label: 'Full-time', description: '40+ hours/week' },
  { value: 'specific_hours', label: 'Specific Hours', description: 'Must work during my timezone' },
];

export default function Step10Preferences({ formData, updateFormData }: Props) {
  const toggleLocation = (location: string) => {
    const current = formData.preferred_locations || [];
    if (current.includes(location)) {
      updateFormData({
        preferred_locations: current.filter((l) => l !== location),
      });
    } else {
      updateFormData({
        preferred_locations: [...current, location],
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Additional Preferences</h2>
        <p className="text-muted-foreground">
          Fine-tune your requirements to find the perfect match
        </p>
      </div>

      {/* English Level */}
      <div className="space-y-4">
        <Label className="text-base font-medium flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          English Proficiency
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ENGLISH_LEVELS.map((level) => {
            const isSelected = formData.english_level === level.value;
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => updateFormData({ english_level: level.value })}
                aria-pressed={isSelected}
                className={`glass-card p-4 rounded-xl text-left transition-all hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 relative overflow-hidden ${
                  isSelected
                    ? 'border-primary/80 bg-[rgba(37,99,235,0.25)] shadow-[0_18px_50px_rgba(37,99,235,0.25)]'
                    : 'border-white/10'
                }`}
              >
                {isSelected && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/40 animate-shimmer" />
                )}
                <div className={`font-semibold mb-1 ${isSelected ? 'text-white tracking-wide' : ''}`}>{level.label}</div>
                <div className={`text-sm ${isSelected ? 'text-primary/70' : 'text-muted-foreground'}`}>
                  {level.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preferred Locations */}
      <div className="space-y-4">
        <Label className="text-base font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Preferred Artist Locations (Optional)
        </Label>
        <p className="text-sm text-muted-foreground">
          Select regions you prefer. Leave empty for worldwide talent.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {REGIONS.map((region) => {
            const isSelected = formData.preferred_locations.includes(region);
            return (
              <div
                key={region}
                className={`glass-card p-3 rounded-xl transition-all relative ${
                  isSelected
                    ? 'border-primary/80 bg-[rgba(37,99,235,0.22)] shadow-[0_16px_40px_rgba(37,99,235,0.22)]'
                    : ''
                }`}
              >
                {isSelected && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/30 animate-shimmer" />
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`region-${region}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleLocation(region)}
                  />
                  <label
                    htmlFor={`region-${region}`}
                    className={`text-sm cursor-pointer flex-1 ${isSelected ? 'text-white font-medium' : ''}`}
                  >
                    {region}
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Stage */}
      <div className="space-y-4">
        <Label className="text-base font-medium flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          Project Stage
        </Label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PROJECT_STAGES.map((stage) => {
            const isSelected = formData.project_stage === stage.value;
            return (
              <button
                key={stage.value}
                type="button"
                onClick={() => updateFormData({ project_stage: stage.value })}
                aria-pressed={isSelected}
                className={`glass-card p-4 rounded-xl text-center transition-all hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 relative overflow-hidden ${
                  isSelected
                    ? 'border-primary/80 bg-[rgba(37,99,235,0.25)] shadow-[0_20px_55px_rgba(37,99,235,0.3)]'
                    : 'border-white/10'
                }`}
              >
                {isSelected && (
                  <>
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/40 animate-shimmer" />
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.4),transparent_60%)]" />
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(37,99,235,0.35),transparent_65%)]" />
                  </>
                )}
                <div className={`text-3xl mb-2 ${isSelected ? 'drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]' : ''}`}>{stage.icon}</div>
                <div className={`text-sm font-medium ${isSelected ? 'text-white tracking-wide' : ''}`}>{stage.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Availability Requirement */}
      <div className="space-y-4">
        <Label className="text-base font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Availability Requirement
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AVAILABILITY_REQUIREMENTS.map((req) => {
            const isSelected = formData.availability_requirement === req.value;
            return (
              <button
                key={req.value}
                type="button"
                onClick={() => updateFormData({ availability_requirement: req.value })}
                aria-pressed={isSelected}
                className={`glass-card p-4 rounded-xl text-left transition-all hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 relative overflow-hidden ${
                  isSelected
                    ? 'border-primary/80 bg-[rgba(37,99,235,0.25)] shadow-[0_18px_50px_rgba(37,99,235,0.28)]'
                    : 'border-white/10'
                }`}
              >
                {isSelected && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/40 animate-shimmer" />
                )}
                <div className={`font-semibold mb-1 ${isSelected ? 'text-white tracking-wide' : ''}`}>{req.label}</div>
                <div className={`text-sm ${isSelected ? 'text-primary/70' : 'text-muted-foreground'}`}>
                  {req.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Card */}
      {(formData.english_level || formData.project_stage || formData.availability_requirement) && (
        <div className="glass-card p-5 rounded-xl border-primary/30 animate-slide-up">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-primary mb-2">Your Preferences</p>
              <ul className="text-muted-foreground space-y-1.5">
                {formData.english_level && formData.english_level !== 'any' && (
                  <li>
                    • English: {ENGLISH_LEVELS.find(l => l.value === formData.english_level)?.label}
                  </li>
                )}
                {formData.preferred_locations.length > 0 && (
                  <li>
                    • Preferred regions: {formData.preferred_locations.join(', ')}
                  </li>
                )}
                {formData.project_stage && (
                  <li>
                    • Stage: {PROJECT_STAGES.find(s => s.value === formData.project_stage)?.label}
                  </li>
                )}
                {formData.availability_requirement && (
                  <li>
                    • Availability: {AVAILABILITY_REQUIREMENTS.find(a => a.value === formData.availability_requirement)?.label}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Optional Notice */}
      <div className="glass-card p-4 rounded-xl bg-muted/5">
        <p className="text-sm text-muted-foreground text-center">
          All preferences on this page are optional. Setting them helps narrow your search, but you&apos;ll
          still receive proposals from all qualified freelancers.
        </p>
      </div>
    </div>
  );
}
