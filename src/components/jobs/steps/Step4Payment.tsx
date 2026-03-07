'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { CircleDollarSign, Clock, FileCheck, CalendarDays } from 'lucide-react';
import type { JobFormData } from '../CreateJobWizard';
import { parseISOToCalendarDate, formatCalendarDateToISO, getTodayCalendarDate } from '@/lib/date-utils';
import type { DateValue } from '@internationalized/date';

interface Props {
  formData: JobFormData;
  updateFormData: (data: Partial<JobFormData>) => void;
}

const PAYMENT_TYPES = [
  {
    value: 'fixed_price',
    label: 'Fixed Price',
    description: 'Pay a set amount for the entire project',
    icon: FileCheck,
    bestFor: 'Well-defined projects with clear deliverables',
  },
  {
    value: 'hourly',
    label: 'Hourly Rate',
    description: 'Pay for hours worked',
    icon: Clock,
    bestFor: 'Ongoing work or projects with flexible scope',
  },
];

export default function Step4Payment({ formData, updateFormData }: Props) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Set your budget</h2>
        <p className="text-muted-foreground">
          Choose how you want to pay for this project
        </p>
      </div>

      {/* Payment Type Selection */}
      <div className="space-y-4">
        <Label className="text-lg font-medium">
          Payment Type <span className="text-destructive">*</span>
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PAYMENT_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => updateFormData({ payment_type: type.value as JobFormData['payment_type'] })}
                className={`glass-card p-5 rounded-xl text-left transition-all hover-lift ${
                  formData.payment_type === type.value
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg mb-1">{type.label}</div>
                    <div className="text-sm text-muted-foreground mb-2">{type.description}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pl-11">
                  Best for: {type.bestFor}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fixed Price Budget */}
      {formData.payment_type === 'fixed_price' && (
        <div className="space-y-4 animate-slide-up">
          <Label htmlFor="budget" className="text-lg font-medium">
            Project Budget (USD) <span className="text-destructive">*</span>
          </Label>

          <div className="relative">
            <CircleDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="budget"
              type="number"
              value={formData.budget_amount || ''}
              onChange={(e) => updateFormData({ budget_amount: Number(e.target.value) })}
              placeholder="5000"
              className="pl-10 text-lg"
              min={100}
            />
          </div>
        </div>
      )}

      {/* Hourly Rate Range */}
      {formData.payment_type === 'hourly' && (
        <div className="space-y-4 animate-slide-up">
          <Label className="text-lg font-medium">
            Hourly Rate (USD) <span className="text-destructive">*</span>
          </Label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hourly_min" className="text-sm text-muted-foreground mb-2 block">
                Minimum Rate
              </Label>
              <div className="relative">
                <CircleDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="hourly_min"
                  type="number"
                  value={formData.hourly_rate_min ?? ''}
                  onChange={(e) => {
                    const { value } = e.target;
                    updateFormData({
                      hourly_rate_min: value === '' ? undefined : Number(value),
                    });
                  }}
                  placeholder="5"
                  className="pl-10"
                  min={5}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="hourly_max" className="text-sm text-muted-foreground mb-2 block">
                Maximum Rate <span className="text-muted-foreground/70">(optional)</span>
              </Label>
              <div className="relative">
                <CircleDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="hourly_max"
                  type="number"
                  value={formData.hourly_rate_max ?? ''}
                  onChange={(e) => {
                    const { value } = e.target;
                    updateFormData({
                      hourly_rate_max: value === '' ? undefined : Number(value),
                    });
                  }}
                  placeholder="25"
                  className="pl-10"
                  min={formData.hourly_rate_min || 5}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a single hourly rate or share a range. Leave the second field blank if it doesn&apos;t apply.
          </p>
        </div>
      )}

      <div className="space-y-3 animate-slide-up">
        <Label htmlFor="application_deadline" className="text-lg font-medium flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Application Deadline <span className="text-destructive">*</span>
        </Label>
        <DatePicker
          value={parseISOToCalendarDate(formData.application_deadline)}
          onChange={(date) => updateFormData({ application_deadline: formatCalendarDateToISO(date) || '' })}
          placeholder="Select application deadline"
          minValue={getTodayCalendarDate()}
          className="glass-card h-12"
        />
        <p className="text-sm text-muted-foreground">
          Choose the last day freelancers can submit proposals.
        </p>
      </div>
    </div>
  );
}
