'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Lightbulb, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { JobFormData } from '../CreateJobWizard';

interface Props {
  formData: JobFormData;
  updateFormData: (data: Partial<JobFormData>) => void;
}

const TITLE_EXAMPLES = {
  'Development & IT': [
    'Mobile App Developer (iOS/Android)',
    'Full-Stack Engineer for E-commerce Platform',
    'WordPress Developer for Business Website',
  ],
  'Design & Creative': [
    'Graphic Designer for Brand Identity',
    'UI/UX Designer for Mobile App Redesign',
    'Video Editor for Social Media Content',
  ],
  'Writing & Content': [
    'Content Writer for Tech Blog',
    'Copywriter for Marketing Campaign',
    'Technical Writer for API Documentation',
  ],
  'Sales & Marketing': [
    'Social Media Manager for E-commerce',
    'SEO Specialist for Website Optimization',
    'Email Marketing Expert for Lead Generation',
  ],
  'Admin & Customer Support': [
    'Virtual Assistant for Busy Entrepreneur',
    'Customer Support Specialist for SaaS Company',
    'Data Entry Specialist for Business Operations',
  ],
};

export default function Step2Title({ formData, updateFormData }: Props) {
  const examples = TITLE_EXAMPLES[formData.category as keyof typeof TITLE_EXAMPLES] || [];

  const characterCount = formData.title.length;
  const descriptionCount = formData.description.length;

  const generateSuggestion = () => {
    // Simple AI-like suggestion based on category
    if (formData.category && examples.length > 0) {
      const randomExample = examples[Math.floor(Math.random() * examples.length)];
      updateFormData({ title: randomExample });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="title" className="text-lg font-medium">
            Job Title <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={generateSuggestion}
            className="text-primary hover:text-primary/80"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Suggest
          </Button>
        </div>

        <Input
          id="title"
          value={formData.title}
          onChange={(e) => updateFormData({ title: e.target.value })}
          placeholder="e.g., Social Media Manager for Growing Startup"
          maxLength={70}
          className="text-lg"
        />

        <div className="flex items-center justify-between text-xs">
          <span className={characterCount < 10 ? 'text-destructive' : 'text-muted-foreground'}>
            {characterCount < 10 ? `At least ${10 - characterCount} more characters needed` : 'Great!'}
          </span>
          <span className={characterCount > 60 ? 'text-amber-500' : 'text-muted-foreground'}>
            {characterCount}/70
          </span>
        </div>

        {/* Examples */}
        {examples.length > 0 && formData.title.length < 5 && (
          <div className="glass-card p-4 rounded-lg">
            <div className="flex items-start gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
              <span className="text-sm font-medium">Example titles:</span>
            </div>
            <div className="space-y-1.5 pl-6">
              {examples.map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => updateFormData({ title: example })}
                  className="text-sm text-muted-foreground hover:text-foreground text-left block"
                >
                  • {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Description Section */}
      <div className="space-y-4">
        <Label htmlFor="description" className="text-lg font-medium">
          Job Description <span className="text-destructive">*</span>
        </Label>

        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder={`Describe your project in detail. Include:
• What you want to achieve
• Required deliverables
• Preferred tools or technologies
• Timeline and milestones
• Any specific requirements`}
          rows={12}
          className="text-base"
        />

        <div className="flex items-center justify-between text-xs">
          <span className={descriptionCount < 50 ? 'text-destructive' : 'text-muted-foreground'}>
            {descriptionCount < 50 ? `At least ${50 - descriptionCount} more characters needed` : 'Good length!'}
          </span>
          <span className="text-muted-foreground">{descriptionCount} characters</span>
        </div>

        {/* Smart Suggestions */}
        {descriptionCount > 20 && descriptionCount < 100 && (
          <div className="glass-card p-4 rounded-lg border-amber-500/30">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-200 mb-1">💡 Tip: Make it compelling</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Explain what success looks like</li>
                  <li>• Mention specific deliverables</li>
                  <li>• Include timeline expectations</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
