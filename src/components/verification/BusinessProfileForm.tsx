"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LocationAutocompleteInput from '@/components/ui/LocationAutocompleteInput';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Building2, Mail, Phone, MapPin, AlertCircle, FileText, Hash } from 'lucide-react';

interface BusinessProfileFormProps {
  onComplete: () => void;
  onBack?: () => void;
}

export default function BusinessProfileForm({ onComplete, onBack }: BusinessProfileFormProps) {
  const [formData, setFormData] = useState({
    businessName: '',
    businessRegistrationNumber: '',
    taxId: '',
    businessEmail: '',
    businessPhone: '',
    businessAddressLine1: '',
    businessAddressLine2: '',
    businessCity: '',
    businessState: '',
    businessCountry: '',
    businessPostalCode: '',
  });

  const utils = trpc.useUtils();

  // Get profile (use getMyProfile to get all fields including business fields)
  const { data: profile, isLoading: isLoadingProfile } = trpc.profiles.getMyProfile.useQuery();

  // Update business profile mutation
  const updateBusinessProfile = trpc.profiles.updateBusinessProfile.useMutation({
    onSuccess: () => {
      toast.success('Business information saved successfully');
      utils.profiles.getProfile.invalidate();
      onComplete();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save business information');
    },
  });

  // Load existing data
  useEffect(() => {
    if (profile) {
      setFormData({
        businessName: profile.companyName || '',
        businessRegistrationNumber: profile.businessRegistrationNumber || '',
        taxId: profile.taxId || '',
        businessEmail: profile.businessEmail || '',
        businessPhone: profile.businessPhone || '',
        businessAddressLine1: profile.businessAddressLine1 || '',
        businessAddressLine2: profile.businessAddressLine2 || '',
        businessCity: profile.businessCity || '',
        businessState: profile.businessState || '',
        businessCountry: profile.businessCountry || '',
        businessPostalCode: profile.businessPostalCode || '',
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }

    if (!formData.businessRegistrationNumber.trim()) {
      toast.error('Business registration number is required');
      return;
    }

    if (!formData.businessEmail.trim()) {
      toast.error('Business email is required');
      return;
    }

    if (!formData.businessPhone.trim()) {
      toast.error('Business phone is required');
      return;
    }

    if (!formData.businessAddressLine1.trim() || !formData.businessCity.trim() || !formData.businessCountry.trim()) {
      toast.error('Complete business address is required');
      return;
    }

    // Update business profile
    updateBusinessProfile.mutate(formData);
  };

  if (isLoadingProfile) {
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
          <Building2 className="h-8 w-8 text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">
          Business Information
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Provide your business details. This information will be verified against official business records.
        </p>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-200 font-semibold text-sm mb-1">Important</p>
            <p className="text-blue-100/80 text-xs">
              All business information must match your official business registration documents.
              You will be required to upload supporting documents in the next step.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Details */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-5">
          <h3 className="text-lg font-semibold text-white mb-4">Business Details</h3>

          {/* Business Name */}
          <div>
            <Label htmlFor="businessName" className="text-white text-sm mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Legal Business Name
              <span className="text-red-400">*</span>
            </Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="Acme Corporation Inc."
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              required
            />
          </div>

          {/* Business Registration Number */}
          <div>
            <Label htmlFor="businessRegistrationNumber" className="text-white text-sm mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Business Registration Number
              <span className="text-red-400">*</span>
            </Label>
            <Input
              id="businessRegistrationNumber"
              value={formData.businessRegistrationNumber}
              onChange={(e) => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
              placeholder="123456789"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Company registration or incorporation number</p>
          </div>

          {/* Tax ID */}
          <div>
            <Label htmlFor="taxId" className="text-white text-sm mb-2 flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Tax ID / EIN
            </Label>
            <Input
              id="taxId"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              placeholder="12-3456789"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-500 mt-1">Employer Identification Number or Tax ID (optional but recommended)</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-5">
          <h3 className="text-lg font-semibold text-white mb-4">Business Contact Information</h3>

          {/* Business Email */}
          <div>
            <Label htmlFor="businessEmail" className="text-white text-sm mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Business Email
              <span className="text-red-400">*</span>
            </Label>
            <Input
              id="businessEmail"
              type="email"
              value={formData.businessEmail}
              onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
              placeholder="contact@acmecorp.com"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              required
            />
          </div>

          {/* Business Phone */}
          <div>
            <Label htmlFor="businessPhone" className="text-white text-sm mb-2 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Business Phone
              <span className="text-red-400">*</span>
            </Label>
            <Input
              id="businessPhone"
              type="tel"
              value={formData.businessPhone}
              onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
              placeholder="+1 (555) 123-4567"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              required
            />
          </div>
        </div>

        {/* Business Address */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Business Address
          </h3>

          {/* Street Address with Autocomplete */}
          <div>
            <Label htmlFor="businessAddressLine1" className="text-white text-sm mb-2">
              Street Address
              <span className="text-red-400 ml-1">*</span>
            </Label>
            <LocationAutocompleteInput
              id="businessAddressLine1"
              value={formData.businessAddressLine1}
              onChange={(value) => setFormData({ ...formData, businessAddressLine1: value })}
              onPlaceSelected={(place) => {
                // Auto-fill address components when a place is selected
                if (typeof window !== 'undefined' && window.google?.maps) {
                  const geocoder = new window.google.maps.Geocoder();
                  geocoder.geocode({ address: place.address }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                      const components = results[0].address_components;
                      const updatedData: any = { ...formData, businessAddressLine1: place.address };

                      components.forEach((component: any) => {
                        const types = component.types;
                        if (types.includes('locality')) {
                          updatedData.businessCity = component.long_name;
                        } else if (types.includes('administrative_area_level_1')) {
                          updatedData.businessState = component.short_name;
                        } else if (types.includes('country')) {
                          updatedData.businessCountry = component.long_name;
                        } else if (types.includes('postal_code')) {
                          updatedData.businessPostalCode = component.long_name;
                        }
                      });

                      setFormData(updatedData);
                      toast.success('Address details auto-filled! Please verify and edit if needed.');
                    }
                  });
                }
              }}
              placeholder="Start typing business address..."
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              types={['address']}
            />
            <p className="text-xs text-slate-400 mt-1">
              Start typing to auto-fill all address fields
            </p>
          </div>

          {/* Address Line 2 */}
          <div>
            <Label htmlFor="businessAddressLine2" className="text-white text-sm mb-2">
              Address Line 2 (Optional)
            </Label>
            <Input
              id="businessAddressLine2"
              value={formData.businessAddressLine2}
              onChange={(e) => setFormData({ ...formData, businessAddressLine2: e.target.value })}
              placeholder="Suite 100, Floor 5"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>

          {/* City and State */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="businessCity" className="text-white text-sm mb-2">
                City
                <span className="text-red-400 ml-1">*</span>
              </Label>
              <Input
                id="businessCity"
                value={formData.businessCity}
                onChange={(e) => setFormData({ ...formData, businessCity: e.target.value })}
                placeholder="New York"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                required
              />
            </div>

            <div>
              <Label htmlFor="businessState" className="text-white text-sm mb-2">
                State / Province
              </Label>
              <Input
                id="businessState"
                value={formData.businessState}
                onChange={(e) => setFormData({ ...formData, businessState: e.target.value })}
                placeholder="NY"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Country and Postal Code */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="businessCountry" className="text-white text-sm mb-2">
                Country
                <span className="text-red-400 ml-1">*</span>
              </Label>
              <Input
                id="businessCountry"
                value={formData.businessCountry}
                onChange={(e) => setFormData({ ...formData, businessCountry: e.target.value })}
                placeholder="United States"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                required
              />
            </div>

            <div>
              <Label htmlFor="businessPostalCode" className="text-white text-sm mb-2">
                Postal Code
              </Label>
              <Input
                id="businessPostalCode"
                value={formData.businessPostalCode}
                onChange={(e) => setFormData({ ...formData, businessPostalCode: e.target.value })}
                placeholder="10001"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
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
            disabled={updateBusinessProfile.isPending}
            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base ml-auto"
          >
            {updateBusinessProfile.isPending ? (
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
