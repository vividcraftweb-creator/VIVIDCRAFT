'use client';

import { Label } from '@/components/ui/label';
import SkillsSelector from '@/components/ui/skills-selector';
import { Sparkles } from 'lucide-react';
import type { JobFormData } from '../CreateJobWizard';

interface Props {
  formData: JobFormData;
  updateFormData: (data: Partial<JobFormData>) => void;
}

export default function Step3Skills({ formData, updateFormData }: Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">What skills do you need?</h2>
        <p className="text-muted-foreground">
          Select the key skills required for this project
        </p>
      </div>

      <div className="space-y-4">
        <Label className="text-lg font-medium">
          Required Skills <span className="text-destructive">*</span>
        </Label>

        <SkillsSelector
          selectedSkills={formData.skills}
          onSkillsChange={(skills) => updateFormData({ skills })}
          placeholder="Search and select skills..."
        />

        <div className="flex items-center justify-between text-sm">
          <span className={formData.skills.length === 0 ? 'text-destructive' : 'text-muted-foreground'}>
            {formData.skills.length === 0 ? 'Select at least 1 skill' : `${formData.skills.length} skills selected`}
          </span>
          <span className="text-muted-foreground">Maximum 10 skills</span>
        </div>

        {/* Engagement Boost */}
        {formData.skills.length >= 3 && formData.skills.length <= 6 && (
          <div className="glass-card p-4 rounded-lg border-primary/30">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary mb-1">✨ Perfect balance!</p>
                <p className="text-muted-foreground">
                  {formData.skills.length} skills is ideal; specific enough to attract the right talent without being too restrictive.
                </p>
              </div>
            </div>
          </div>
        )}

        {formData.skills.length > 8 && (
          <div className="glass-card p-4 rounded-lg border-amber-500/30">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-200 mb-1">⚠️ Too many skills</p>
                <p className="text-muted-foreground">
                  Consider reducing to 3-6 core skills for better matches. You can mention others in the description.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
