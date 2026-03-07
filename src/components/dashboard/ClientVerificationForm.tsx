'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LocationAutocompleteInput from '@/components/ui/LocationAutocompleteInput';
import { toast } from 'sonner';
import {
  Building2,
  Globe,
  MapPin,
  Clock,
  Briefcase,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface ClientVerificationFormProps {
  onComplete?: () => void;
}

const INDUSTRIES = [
  'Technology & Software',
  'Marketing & Advertising',
  'Finance & Consulting',
  'E-commerce & Retail',
  'Healthcare & Medical',
  'Education & Training',
  'Manufacturing & Industrial',
  'Real Estate & Construction',
  'Media & Entertainment',
  'Non-Profit & Government',
  'Other',
];

const TIMEZONES = [
  'America/New_York (EST/EDT)',
  'America/Chicago (CST/CDT)',
  'America/Denver (MST/MDT)',
  'America/Los_Angeles (PST/PDT)',
  'Europe/London (GMT/BST)',
  'Europe/Paris (CET/CEST)',
  'Asia/Dubai (GST)',
  'Asia/Singapore (SGT)',
  'Asia/Tokyo (JST)',
  'Australia/Sydney (AEST/AEDT)',
  'Other',
];

export default function ClientVerificationForm({ onComplete }: ClientVerificationFormProps) {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [website, setWebsite] = useState('');

  const utils = trpc.useUtils();

  const submitVerification = trpc.profiles.updateClientProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile information saved successfully!');
      utils.profiles.getMyProfile.invalidate();
      utils.user.getCurrentUser.invalidate();
      onComplete?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save profile information');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim() || !industry || !country.trim() || !timezone) {
      toast.error('Please fill in all required fields');
      return;
    }

    submitVerification.mutate({
      companyName: companyName.trim(),
      industry,
      country: country.trim(),
      timezone,
      website: website.trim() || null,
    });
  };

  return (
    <div className="glass-card p-8 rounded-3xl bg-white/5 border border-white/10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-blue-500/20 rounded-2xl mb-4">
          <Building2 className="h-8 w-8 text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Complete Your Profile</h2>
        <p className="text-slate-400 max-w-md mx-auto">
          Help us understand your business better. This information helps freelancers learn about potential clients.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="companyName" className="text-white font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-400" />
            Company or Business Name <span className="text-red-400">*</span>
          </Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g., JobHorizons"
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
          />
          <p className="text-xs text-slate-500">Individual clients can use their full name</p>
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry" className="text-white font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-purple-400" />
            Industry or Company Type <span className="text-red-400">*</span>
          </Label>
          <select
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            required
            className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="" className="bg-slate-900">Select your industry</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind} className="bg-slate-900">
                {ind}
              </option>
            ))}
          </select>
        </div>

        {/* Country and Timezone Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country" className="text-white font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-400" />
              Country <span className="text-red-400">*</span>
            </Label>
            <LocationAutocompleteInput
              id="country"
              value={country}
              onChange={setCountry}
              placeholder="e.g., United States"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
              types={['(regions)']}
            />
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone" className="text-white font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-400" />
              Timezone <span className="text-red-400">*</span>
            </Label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
              className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="" className="bg-slate-900">Select timezone</option>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz} className="bg-slate-900">
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Website (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="website" className="text-white font-medium flex items-center gap-2">
            <Globe className="h-4 w-4 text-cyan-400" />
            Company Website <span className="text-slate-500 font-normal">(Optional)</span>
          </Label>
          <Input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://www.yourcompany.com"
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
          />
        </div>

        {/* Benefits Notice */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-blue-200 font-semibold text-sm">Why we need this information</p>
              <ul className="space-y-1 text-xs text-blue-100/80">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0" />
                  Helps freelancers understand your business context
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0" />
                  Improves proposal quality and relevance
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0" />
                  Facilitates better timezone coordination
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={submitVerification.isPending}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base"
          >
            {submitVerification.isPending ? (
              'Saving...'
            ) : (
              <>
                Continue to ID Upload
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
          <p className="text-xs text-slate-500 text-center mt-3">
            After completing your profile, you&apos;ll upload your ID for free verification
          </p>
        </div>
      </form>
    </div>
  );
}
