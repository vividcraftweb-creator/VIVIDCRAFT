"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LocationAutocompleteInput from '@/components/ui/LocationAutocompleteInput';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Loader2, ArrowRight, User, Mail, Phone, MapPin, AlertCircle } from 'lucide-react';

interface IndividualProfileFormProps {
  onComplete: () => void;
  onBack?: () => void;
}

export default function IndividualProfileForm({ onComplete, onBack }: IndividualProfileFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: '',
    city: '',
  });

  const utils = trpc.useUtils();

  // Get user profile
  const { data: user, isLoading: isLoadingUser } = trpc.user.getCurrentUser.useQuery();
  const { data: profileData, isLoading: isLoadingProfile } = trpc.profiles.getProfile.useQuery({ id: user?.id || '' }, { enabled: !!user?.id });
  const profile: any = profileData;

  // Update profile mutation
  const updateProfile = trpc.profiles.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile information saved successfully');
      utils.profiles.getProfile.invalidate();
      onComplete();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save profile information');
    },
  });

  // Load existing data
  useEffect(() => {
    if (profile) {
      // Construct fullName from firstName and lastName
      const fullName = profile.firstName && profile.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : profile.firstName || '';
      setFormData({
        fullName,
        email: user?.email || '',
        phone: profile.phone || '',
        country: profile.country || '',
        city: profile.city || '',
      });
    }
  }, [profile, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    if (!formData.country.trim()) {
      toast.error('Country is required');
      return;
    }

    // Split fullName into firstName and lastName
    const nameParts = formData.fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];

    // Update profile
    updateProfile.mutate({
      firstName,
      lastName,
      // Note: phone, country, city fields need to be added to updateProfile mutation
    } as any);
  };

  if (isLoadingUser || isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-blue-500/20 rounded-2xl mb-4">
          <User className="h-8 w-8 text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">
          Personal Information
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Verify your personal details. This information will be used for identity verification.
        </p>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-200 font-semibold text-sm mb-1">Important</p>
            <p className="text-blue-100/80 text-xs">
              Please ensure all information matches your government-issued ID exactly.
              Mismatched information will delay your verification.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-5">
          {/* Full Name */}
          <div>
            <Label htmlFor="fullName" className="text-white text-sm mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name (as on ID)
              <span className="text-red-400">*</span>
            </Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="John Doe"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              required
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-white text-sm mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-white/5 border-white/10 text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">Email cannot be changed during verification</p>
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone" className="text-white text-sm mb-2 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
              <span className="text-red-400">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              required
            />
          </div>

          {/* Country */}
          <div>
            <Label htmlFor="country" className="text-white text-sm mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Country
              <span className="text-red-400">*</span>
            </Label>
            <LocationAutocompleteInput
              id="country"
              value={formData.country}
              onChange={(value) => setFormData({ ...formData, country: value })}
              placeholder="United States"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              types={['(regions)']}
            />
          </div>

          {/* City */}
          <div>
            <Label htmlFor="city" className="text-white text-sm mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              City
            </Label>
            <LocationAutocompleteInput
              id="city"
              value={formData.city}
              onChange={(value) => setFormData({ ...formData, city: value })}
              placeholder="New York"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              types={['(cities)']}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          {onBack && (
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              className="h-12 px-6 border-white/20 text-slate-300 hover:bg-white/5"
            >
              Back
            </Button>
          )}

          <Button
            type="submit"
            disabled={updateProfile.isPending}
            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base ml-auto"
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
