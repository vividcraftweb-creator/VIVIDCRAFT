'use client';

import { CheckCircle2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { JobFormData } from '../CreateJobWizard';

interface Props {
  formData: JobFormData;
  updateFormData: (data: Partial<JobFormData>) => void;
  onEditStep?: (step: number) => void;
}

export default function Step5Review({ formData, onEditStep }: Props) {
  const formatDeadline = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return null;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatHourlyRate = (min?: number, max?: number) => {
    const formattedMin = formatCurrency(min);
    const formattedMax = formatCurrency(max);

    if (formattedMin && formattedMax) {
      if (formattedMin === formattedMax) {
        return `${formattedMin}/hr`;
      }
      return `${formattedMin}/hr - ${formattedMax}/hr`;
    }

    if (formattedMin || formattedMax) {
      return `${formattedMin || formattedMax}/hr`;
    }

    return '';
  };

  const sections = [
    {
      title: 'Project Type',
      step: 1,
      items: [
        { label: 'Goal', value: formData.project_goal },
        { label: 'Type', value: formData.job_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) },
        { label: 'Category', value: formData.category },
      ],
    },
    {
      title: 'Job Details',
      step: 2,
      items: [
        { label: 'Title', value: formData.title },
        { label: 'Description', value: formData.description, multiline: true },
      ],
    },
    {
      title: 'Skills Required',
      step: 3,
      items: [
        { label: 'Skills', value: formData.skills.join(', ') || 'None selected' },
      ],
    },
    {
      title: 'Budget & Payment',
      step: 4,
      items: [
        { label: 'Payment Type', value: formData.payment_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) },
        formData.payment_type === 'fixed_price'
          ? { label: 'Budget', value: `$${formData.budget_amount?.toLocaleString() || '0'}` }
          : { label: 'Hourly Rate', value: formatHourlyRate(formData.hourly_rate_min, formData.hourly_rate_max) },
        { label: 'Application Deadline', value: formatDeadline(formData.application_deadline) },
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-4">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Review Your Job Post</h2>
        <p className="text-muted-foreground">
          Make sure everything looks good before publishing
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="glass-card p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{section.title}</h3>
              {onEditStep && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditStep(section.step)}
                  className="text-primary hover:text-primary/80"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {section.items.map((item, index) => (
                item?.value && (
                  <div key={index}>
                    <dt className="text-sm text-muted-foreground mb-1">{item.label}</dt>
                    <dd className={`text-foreground ${item.multiline ? 'whitespace-pre-wrap' : ''}`}>
                      {item.multiline && item.value.length > 200
                        ? item.value.substring(0, 200) + '...'
                        : item.value}
                    </dd>
                  </div>
                )
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Publishing Info */}
      <div className="glass-card p-6 rounded-xl border-primary/30">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium mb-2">What happens next?</p>
            <ul className="text-muted-foreground space-y-1.5">
              <li>✓ Your job will be published immediately</li>
              <li>✓ Artists with matching skills will be notified</li>
              <li>✓ You&apos;ll start receiving proposals within hours</li>
              <li>✓ You can edit or pause the job anytime</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
