'use client';

import { useState, useEffect } from 'react';
import { useAuth as useSession } from '@/hooks/useAuth';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import LocationAutocompleteInput from '@/components/ui/LocationAutocompleteInput';
import { type Profile } from '@/types/database.types';
import { toast } from 'sonner';
import { User, Briefcase, MapPin, DollarSign, Link as LinkIcon, Save, Phone, Globe, Clock } from 'lucide-react';

type ProfileFormState = Partial<Omit<Profile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

export default function ProfileEditView() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileFormState>({});

  const utils = trpc.useUtils();

  const profileQuery = trpc.profiles.getMyProfile.useQuery(undefined, {
    enabled: !!session?.session?.user,
  });

  const updateProfileMutation = trpc.profiles.updateProfile.useMutation({
    onSuccess: () => {
      utils.profiles.getMyProfile.invalidate();
      toast.success('Profile updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update profile', {
        description: error.message || 'Please try again.',
      });
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      // Use profile data with session metadata as fallback for missing fields
      setProfile({
        ...profileQuery.data,
        firstName: profileQuery.data.firstName || session?.session?.user?.user_metadata?.firstName || '',
        lastName: profileQuery.data.lastName || session?.session?.user?.user_metadata?.lastName || '',
      });
    } else if (session?.session?.user) {
      // If no profile data exists, initialize with session metadata
      setProfile({
        firstName: session.session.user.user_metadata?.firstName || '',
        lastName: session.session.user.user_metadata?.lastName || '',
      });
    }
  }, [profileQuery.data]); // Only depend on profileQuery.data, not session

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setProfile((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const profileData = { ...profile };
      // Convert null values to undefined to match Zod schema
      Object.keys(profileData).forEach((key) => {
        if (profileData[key as keyof typeof profileData] === null) {
          profileData[key as keyof typeof profileData] = undefined;
        }
      });

      await updateProfileMutation.mutateAsync({
        ...profileData,
        rate: profileData.rate ? Number(profileData.rate) : undefined,
      });
    } catch (error: unknown) {
      // Error handled by mutation onError
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 sm:p-8 rounded-3xl bg-white/5 border border-white/10">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Edit Your Profile</h2>
          <p className="text-slate-400">Update your professional information</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-white font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-blue-400" />
                First Name
              </Label>
              <Input
                id="firstName"
                value={profile.firstName || ''}
                onChange={handleChange}
                placeholder="John"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-white font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-blue-400" />
                Last Name
              </Label>
              <Input
                id="lastName"
                value={profile.lastName || ''}
                onChange={handleChange}
                placeholder="Doe"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-white font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-400" />
              Professional Title
            </Label>
            <Input
              id="title"
              value={profile.title || ''}
              onChange={handleChange}
              placeholder="e.g., Senior Software Engineer"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-white font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-green-400" />
              Bio
            </Label>
            <Textarea
              id="bio"
              value={profile.bio || ''}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 min-h-32"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-white font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-400" />
              Location
            </Label>
            <LocationAutocompleteInput
              id="location"
              value={profile.location || ''}
              onChange={(value) => setProfile((prev) => ({ ...prev, location: value }))}
              placeholder="e.g., San Francisco, CA"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
              types={['(cities)']}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white font-medium flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-400" />
              Phone Number
            </Label>
            <Input
              id="phone"
              value={profile.phone || ''}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
            />
          </div>

          {/* Role-specific fields */}
          {session?.session?.user.role === 'FREELANCER' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="skills" className="text-white font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-cyan-400" />
                  Skills (comma-separated)
                </Label>
                <Input
                  id="skills"
                  value={profile.skills || ''}
                  onChange={handleChange}
                  placeholder="e.g., React, TypeScript, Node.js"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate" className="text-white font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  Hourly Rate ($)
                </Label>
                <Input
                  id="rate"
                  type="number"
                  value={profile.rate || ''}
                  onChange={handleChange}
                  placeholder="e.g., 50"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="portfolio" className="text-white font-medium flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-purple-400" />
                  Portfolio URL
                </Label>
                <Input
                  id="portfolio"
                  value={profile.portfolio || ''}
                  onChange={handleChange}
                  placeholder="https://yourportfolio.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience" className="text-white font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-orange-400" />
                  Years of Experience
                </Label>
                <Input
                  id="experience"
                  value={profile.experience || ''}
                  onChange={handleChange}
                  placeholder="e.g., 5 years"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
                />
              </div>
            </>
          )}

          {session?.session?.user.role === 'CLIENT' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-white font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-400" />
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  value={profile.companyName || ''}
                  onChange={handleChange}
                  placeholder="e.g., Acme Corporation"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyInfo" className="text-white font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-purple-400" />
                  Company Info
                </Label>
                <Textarea
                  id="companyInfo"
                  value={profile.companyInfo || ''}
                  onChange={handleChange}
                  placeholder="Tell us about your company..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 min-h-32"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry" className="text-white font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-cyan-400" />
                  Industry
                </Label>
                <Input
                  id="industry"
                  value={profile.industry || ''}
                  onChange={handleChange}
                  placeholder="e.g., Technology, Finance, Healthcare"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country" className="text-white font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  Country
                </Label>
                <Input
                  id="country"
                  value={profile.country || ''}
                  onChange={handleChange}
                  placeholder="e.g., United States, United Kingdom"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-white font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-400" />
                  Timezone
                </Label>
                <Input
                  id="timezone"
                  value={profile.timezone || ''}
                  onChange={handleChange}
                  placeholder="e.g., UTC-05:00 (EST)"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-white font-medium flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-green-400" />
                  Company Website
                </Label>
                <Input
                  id="website"
                  value={profile.website || ''}
                  onChange={handleChange}
                  placeholder="https://yourcompany.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
                />
              </div>
            </>
          )}

          <div className="pt-4">
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base"
            >
              {updateProfileMutation.isPending ? (
                'Saving...'
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
