'use client';

import { useState, useEffect } from 'react';
import { useAuth as useSession } from '@/hooks/useAuth';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Profile } from '@/types/database.types';
import { toast } from 'sonner';
import { INDUSTRIES } from '@/lib/countries-timezones';

type ProfileFormState = Partial<Omit<Profile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

export default function EditProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileFormState>({});

  const utils = trpc.useUtils();

  const profileQuery = trpc.profiles.getMyProfile.useQuery(undefined, {
    enabled: !!session?.session?.user,
  });

  const updateProfileMutation = trpc.profiles.updateProfile.useMutation({
    onSuccess: () => {
      // Invalidate and refetch profile data to show updated values
      utils.profiles.getMyProfile.invalidate();
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

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
      toast.success('Profile updated successfully!');
    } catch (error: unknown) {
    }
  };

  if (profileQuery.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={profile.firstName || ''}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={profile.lastName || ''}
                onChange={handleChange}
              />
            </div>
            {session?.session?.user.role === 'FREELANCER' && (
              <>
                <div>
                  <Label htmlFor="skills">Skills (comma-separated)</Label>
                  <Input
                    id="skills"
                    value={profile.skills || ''}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="rate">Hourly Rate ($)</Label>
                  <Input
                    id="rate"
                    type="number"
                    value={profile.rate || ''}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="portfolio">Portfolio URL</Label>
                  <Input
                    id="portfolio"
                    value={profile.portfolio || ''}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}
            {session?.session?.user.role === 'CLIENT' && (
              <>
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={profile.companyName || ''}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={profile.industry || ''}
                    onValueChange={(value) => setProfile((prev) => ({ ...prev, industry: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="companyInfo">Company Info</Label>
                  <Textarea
                    id="companyInfo"
                    value={profile.companyInfo || ''}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
