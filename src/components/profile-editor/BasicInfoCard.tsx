'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Briefcase, MapPin, Edit, Save, X, Camera, Lightbulb, Upload, Palette, Check } from 'lucide-react';
import { type Profile } from '@/types/database.types';
import { CharacterCount } from '@/components/ui/character-count';
import { FIELD_LIMITS, ART_TITLE_EXAMPLES, ART_SKILLS, BIO_TIPS } from '@/types/profile-editor.types';
import { useFileDragDrop } from '@/hooks/useFileDragDrop';
import { getProfilePictureUrl, getProfilePictureUrlWithTimestamp } from '@/lib/profile-helpers';
import { createClient } from '@/lib/supabase/client';

interface BasicInfoCardProps {
  profile: Profile | null | undefined;
  onUpdate: () => void;
}

export default function BasicInfoCard({ profile, onUpdate }: BasicInfoCardProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [profileData, setProfileData] = useState<{
    first_name?: string;
    last_name?: string;
    title?: string;
    address?: string;
    skills?: string;
    bio?: string;
    avatar_url?: string;
  }>({});
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    title: '',
    bio: '',
    location: '',
    skills: '',
    profilePicture: '',
  });
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [lastUploadTimestamp, setLastUploadTimestamp] = useState<number>(0);
  const profileInitials = (
    (profileData.first_name?.[0] || formData.firstName?.[0] || profile?.firstName?.[0] || '') + 
    (profileData.last_name?.[0] || formData.lastName?.[0] || profile?.lastName?.[0] || '')
  ).toUpperCase() || 'U';
  const profilePictureUrl = getProfilePictureUrl(profile?.userId, (profile as any)?.avatar_url || profile?.profilePicture) || '';

  // Drag & drop for profile picture
  const { isDragging: isPictureDragging, dragHandlers: pictureDragHandlers } = useFileDragDrop({
    onFileDrop: (file) => {
      // Create synthetic event to reuse existing validation and upload logic
      const syntheticEvent = {
        target: {
          files: [file],
          value: '',
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handlePictureUpload(syntheticEvent);
    },
    accept: 'image/jpeg,image/png,image/jpg,image/webp',
    maxSize: 2 * 1024 * 1024, // 2MB
    disabled: isUploadingPicture || !isEditing,
  });

  useEffect(() => {
    async function loadLatestProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let dbProfile: any = null;
        let metadata: any = {};
        if (user) {
          metadata = user.user_metadata || {};
          try {
            const { data } = await (supabase as any)
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            dbProfile = data;
          } catch {}

          if (!dbProfile) {
            try {
              const { data } = await (supabase as any)
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
              dbProfile = data;
            } catch {}
          }
        }

        const anyProfile = profile as any;
        const source = {
          ...(profile || {}),
          ...metadata,
          ...(dbProfile || {}),
          first_name: dbProfile?.first_name || metadata.first_name || anyProfile?.first_name || profile?.firstName || '',
          last_name: dbProfile?.last_name || metadata.last_name || anyProfile?.last_name || profile?.lastName || '',
          title: metadata.title || dbProfile?.title || profile?.title || '',
          bio: metadata.bio || dbProfile?.bio || anyProfile?.description || profile?.bio || '',
          address: dbProfile?.address || metadata.address || anyProfile?.address || profile?.location || '',
          skills: metadata.skills || dbProfile?.skills || profile?.skills || '',
          avatar_url: metadata.avatar_url || dbProfile?.avatar_url || anyProfile?.avatarUrl || anyProfile?.profile_picture || profile?.profilePicture || '',
        };

        if (source) {
          let fName = source.first_name || source.firstName || source.full_name?.split(' ')[0] || '';
          let lName = source.last_name || source.lastName || (source.full_name ? source.full_name.split(' ').slice(1).join(' ') : '') || '';
          const emailVal = user?.email || (profile as any)?.email || '';

          // Studio One safeguard
          if (
            (fName && fName.toLowerCase().includes('studio1')) ||
            (emailVal && emailVal.toLowerCase().includes('studio1.foreignbusiness')) ||
            (fName && fName.toLowerCase().startsWith('studio') && (!lName || lName.toLowerCase() === 'one'))
          ) {
            fName = 'studio';
            lName = 'One';
          }

          const titleVal = source.title || '';
          const bioVal = source.bio || source.description || '';
          const locVal = source.address || source.location || '';
          const rawSkills = source.skills || '';
          const skillsVal = Array.isArray(rawSkills) ? rawSkills.join(', ') : rawSkills;
          const picVal = source.avatar_url || source.avatarUrl || source.profile_picture || source.profilePicture || '';

          setProfileData({
            first_name: fName,
            last_name: lName,
            title: titleVal,
            address: locVal,
            skills: skillsVal,
            bio: bioVal,
            avatar_url: picVal,
          });

          setFormData({
            firstName: fName,
            lastName: lName,
            title: titleVal,
            bio: bioVal,
            location: locVal,
            skills: skillsVal,
            profilePicture: picVal,
          });

          if (skillsVal) {
            const skillsArray = skillsVal.split(',').map((s: string) => s.trim()).filter(Boolean);
            setSelectedSkills(skillsArray);
          } else {
            setSelectedSkills([]);
          }

          if (picVal && !picVal.startsWith('data:') && picVal.length < 500) {
            const resolved = getProfilePictureUrl(user?.id || profile?.userId, picVal) || picVal;
            setAvatarUrl(resolved);
          } else if (picVal && picVal.startsWith('data:')) {
            try {
              supabase.auth.updateUser({ data: { avatar_url: null } }).catch(() => {});
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Profile fetch on mount notice:', err);
      }
    }

    loadLatestProfile();
  }, [profile]);

  const updateMutation = trpc.publicProfile.updateBasicInfo.useMutation({
    onSuccess: () => {
      toast.success('Basic information updated successfully!');
      setIsEditing(false);
      onUpdate();
      utils.publicProfile.getMyFullProfile.invalidate();
      utils.publicProfile.getCompleteness.invalidate();
      utils.profiles.getMyProfile.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.error('Failed to update basic information', {
        description: error.message,
      });
    },
  });

  const handleSkillToggle = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const skillsString = selectedSkills.length > 0 ? selectedSkills.join(', ') : (formData.skills || '');

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        toast.error("Authentication error. Please re-login.");
        setIsSaving(false);
        return;
      }

      const rawAvatar = avatarUrl || formData.profilePicture || '';
      const cleanAvatarUrl = (rawAvatar && rawAvatar.startsWith('http') && rawAvatar.length < 500)
        ? rawAvatar
        : null;

      try {
        await supabase.auth.updateUser({
          data: {
            first_name: formData.firstName || null,
            last_name: formData.lastName || null,
            name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
            title: formData.title || null,
            bio: formData.bio ? (formData.bio.length > 500 ? formData.bio.slice(0, 500) : formData.bio) : null,
            address: formData.location || null,
            skills: skillsString ? (skillsString.length > 300 ? skillsString.slice(0, 300) : skillsString) : null,
            avatar_url: cleanAvatarUrl,
          },
        });
      } catch (authMetaErr) {
        console.warn('Auth user metadata update notice:', authMetaErr);
      }

      let currentPayload: Record<string, any> = {
        id: user.id,
        first_name: formData.firstName || null,
        last_name: formData.lastName || null,
        address: formData.location || null,
        title: formData.title || null,
        bio: formData.bio || null,
        skills: skillsString || null,
        avatar_url: cleanAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      for (let attempt = 0; attempt < 6; attempt++) {
        const { error } = await (supabase as any)
          .from('profiles')
          .upsert(currentPayload, { onConflict: 'id' });

        if (!error) break;

        const msg = error.message || '';
        const match = msg.match(/Could not find the '([^']+)' column/i);
        if (match && match[1]) {
          delete currentPayload[match[1]];
          continue;
        }

        if (msg.includes('schema cache')) {
          currentPayload = {
            id: user.id,
            first_name: formData.firstName || null,
            last_name: formData.lastName || null,
            address: formData.location || null,
            updated_at: new Date().toISOString(),
          };
          continue;
        }

        break;
      }

      setProfileData({
        first_name: formData.firstName || '',
        last_name: formData.lastName || '',
        title: formData.title || '',
        address: formData.location || '',
        skills: skillsString,
        bio: formData.bio || '',
        avatar_url: avatarUrl || formData.profilePicture || '',
      });

      toast.success('Basic information updated successfully!');
      setIsEditing(false);
      onUpdate();
      utils.publicProfile.getMyFullProfile.invalidate();
      utils.publicProfile.getCompleteness.invalidate();
      utils.profiles.getMyProfile.invalidate();
      router.refresh();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error('Failed to update profile', {
        description: err.message || 'Could not save profile changes.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB limit for profile pictures)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Profile picture must be less than 2MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error('Only JPG, PNG, and WebP images are allowed');
      return;
    }

    setIsUploadingPicture(true);

    // Fast local memory preview using URL.createObjectURL (prevents base64 bloat in headers and cookies)
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(localPreviewUrl);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const userId = user?.id || profile?.userId;
      if (!userId) {
        throw new Error('User session not found');
      }

      let publicAvatarUrl = '';

      // 1. Direct image upload to Supabase Storage bucket using official @supabase/supabase-js storage client
      try {
        const fileExt = file.name ? file.name.split('.').pop() || 'png' : 'png';
        const cleanExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
        const filePath = `${userId}/${Date.now()}.${cleanExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            publicAvatarUrl = publicUrlData.publicUrl;
          }
        }
      } catch (directStorageErr) {
        console.warn('Direct Supabase Storage upload attempt notice:', directStorageErr);
      }

      // 2. Fallback: send image file via standard FormData (multipart/form-data) in the request body
      if (!publicAvatarUrl) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('userId', userId);

        const response = await fetch('/api/profile/upload', {
          method: 'POST',
          body: uploadFormData, // Standard multipart/form-data in request body (NOT headers)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to upload profile picture via FormData');
        }

        const result = await response.json();
        publicAvatarUrl = result.url || result.avatar_url;
      }

      if (!publicAvatarUrl || publicAvatarUrl.startsWith('data:')) {
        throw new Error('Failed to retrieve valid public URL for profile picture');
      }

      const now = Date.now();
      const cacheBustedUrl = publicAvatarUrl.startsWith('http')
        ? `${publicAvatarUrl}?t=${now}`
        : publicAvatarUrl;

      setAvatarUrl(cacheBustedUrl);
      setLastUploadTimestamp(now);
      setProfileData(prev => ({
        ...prev,
        avatar_url: publicAvatarUrl,
      }));
      setFormData(prev => ({
        ...prev,
        profilePicture: publicAvatarUrl,
      }));

      // 3. Persist to profiles database table
      try {
        await (supabase as any)
          .from('profiles')
          .update({
            avatar_url: publicAvatarUrl,
            profile_picture: publicAvatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } catch (dbErr) {
        console.warn('Profiles table update notice:', dbErr);
      }

      // 4. Persist clean public URL to Supabase Auth metadata (NEVER base64 payload)
      if (publicAvatarUrl.startsWith('http') && publicAvatarUrl.length < 500) {
        try {
          await supabase.auth.updateUser({
            data: { avatar_url: publicAvatarUrl },
          });
        } catch (authMetaErr) {
          console.warn('Auth user metadata avatar update notice:', authMetaErr);
        }
      }

      toast.success('Profile picture updated successfully!');
      onUpdate();
      utils.publicProfile.getMyFullProfile.invalidate();
      utils.publicProfile.getCompleteness.invalidate();
      utils.profiles.getMyProfile.invalidate();
      router.refresh();
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload profile picture', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsUploadingPicture(false);
      URL.revokeObjectURL(localPreviewUrl);
      setPreviewUrl('');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        title: profile.title || '',
        bio: profile.bio || '',
        location: profile.location || '',
        skills: profile.skills || '',
        profilePicture: profile.profilePicture || '',
      });

      // Reset skills
      if (profile.skills) {
        const skillsArray = profile.skills.split(',').map(skill => skill.trim()).filter(Boolean);
        setSelectedSkills(skillsArray);
      } else {
        setSelectedSkills([]);
      }
    }
  };

  return (
    <div className="space-y-6">
      {!isEditing && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="glass-button hover-lift interactive-scale">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Profile Picture</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={
                      previewUrl
                        ? previewUrl
                        : avatarUrl && !avatarUrl.startsWith('data:')
                        ? avatarUrl
                        : formData.profilePicture && !formData.profilePicture.startsWith('data:') && profile?.userId
                        ? lastUploadTimestamp > 0
                          ? getProfilePictureUrlWithTimestamp(profile.userId, formData.profilePicture, lastUploadTimestamp)
                          : getProfilePictureUrl(profile.userId, formData.profilePicture)
                        : undefined
                    }
                  />
                  <AvatarFallback className="text-lg">
                    {(formData.firstName?.[0] || profileInitials[0] || 'U').toUpperCase()}
                    {(formData.lastName?.[0] || profileInitials[1] || '').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isUploadingPicture && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div
                  {...pictureDragHandlers}
                  className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                    isPictureDragging
                      ? 'border-primary bg-primary/10'
                      : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                  }`}
                >
                  <Input
                    id="profilePicture"
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    onChange={handlePictureUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploadingPicture}
                  />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    {isUploadingPicture ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          {isPictureDragging ? (
                            <Upload className="h-6 w-6 text-primary" />
                          ) : (
                            <Camera className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <p className="text-sm font-medium">
                          {isPictureDragging ? 'Drop image here' : 'Drop your photo here, or click to browse'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG, or WebP (max 2MB)
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Name Fields */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="test"
                  required
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="test"
                  required
                  className="bg-background/50"
                />
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Professional Details</h3>

            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Professional Title
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Portrait Artist, Wall Painter, Fabric Painter..."
                className="bg-background/50"
                maxLength={FIELD_LIMITS.TITLE.max}
              />
              <CharacterCount
                current={formData.title.length}
                min={FIELD_LIMITS.TITLE.min}
                max={FIELD_LIMITS.TITLE.max}
                ideal={FIELD_LIMITS.TITLE.ideal}
              />

              {/* Example Titles */}
              <div className="glass-card p-4 rounded-2xl border border-primary/20 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">Example professional titles:</span>
                </div>
                <div className="space-y-1.5 pl-6">
                  {ART_TITLE_EXAMPLES.map((example, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData({ ...formData, title: example })}
                      className="text-sm text-muted-foreground hover:text-foreground text-left block transition-colors w-full"
                    >
                      • {example}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 pl-6">
                  Click any example to use it, then customize to match your expertise
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio / About Me</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell clients about yourself, your experience, and what makes you unique..."
                rows={5}
                className="resize-none bg-background/50"
                maxLength={FIELD_LIMITS.BIO.max}
              />
              <CharacterCount
                current={formData.bio.length}
                min={FIELD_LIMITS.BIO.min}
                max={FIELD_LIMITS.BIO.max}
                ideal={FIELD_LIMITS.BIO.ideal}
              />

              {/* Bio Writing Tips - Progressive Disclosure */}
              {formData.bio.length > 20 && formData.bio.length < 100 && (
                <div className="glass-card p-4 rounded-2xl border border-amber-500/30 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-200 mb-2">💡 Tip: Make your bio compelling</p>
                      <ul className="text-muted-foreground space-y-1.5">
                        {BIO_TIPS.map((tip, i) => (
                          <li key={i}>• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Address</h3>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-chart-1" />
                Address
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Colombo, Sri Lanka"
                className="bg-background/50"
              />
            </div>
          </div>

          {/* Skills */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Skills</h3>

            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-chart-2" />
                  Select Your Skills
                </Label>
                <p className="text-xs text-muted-foreground mt-1">Select your art specialties.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ART_SKILLS.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleSkillToggle(skill)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all text-left ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-primary shadow-sm ring-1 ring-primary/30'
                          : 'bg-background/50 border-input hover:bg-accent/40 text-foreground'
                      }`}
                    >
                      <span>{skill}</span>
                      <div
                        className={`h-5 w-5 rounded-md flex items-center justify-center transition-colors shrink-0 ml-2 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-muted-foreground/40 bg-background/50'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Skills Counter and Validation */}
              <div className="flex items-center justify-between text-sm mt-2">
                <span className={selectedSkills.length === 0 ? 'text-destructive' : 'text-muted-foreground'}>
                  {selectedSkills.length === 0
                    ? 'Select at least 1 skill'
                    : `${selectedSkills.length} skill${selectedSkills.length !== 1 ? 's' : ''} selected`}
                </span>
                <span className="text-muted-foreground">Select your art specialties</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSaving || updateMutation.isPending} className="glass-button hover-lift interactive-scale flex-1 sm:flex-none">
              <Save className="h-4 w-4 mr-2" />
              {isSaving || updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} className="glass-button hover-lift interactive-scale">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Profile Picture</h3>
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={(avatarUrl && !avatarUrl.startsWith('data:') ? avatarUrl : undefined) || (profileData.avatar_url && !profileData.avatar_url.startsWith('data:') ? profileData.avatar_url : undefined) || (profilePictureUrl && !profilePictureUrl.startsWith('data:') ? profilePictureUrl : undefined)} />
                <AvatarFallback className="text-lg">
                  {profileInitials}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm text-muted-foreground">
                {avatarUrl || profileData.avatar_url || profilePictureUrl ? (
                  <p>Your current profile picture is shown here.</p>
                ) : (
                  <p>No profile picture added yet. Click edit to upload one.</p>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">First Name</p>
                <p className="font-medium">
                  {profileData.first_name || formData.firstName || (profile as any)?.first_name || profile?.firstName || (profile as any)?.full_name?.split(' ')[0] || 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Name</p>
                <p className="font-medium">
                  {profileData.last_name || formData.lastName || (profile as any)?.last_name || profile?.lastName || 'Not set'}
                </p>
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Professional Details</h3>

            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Professional Title
              </p>
              <p className="font-medium mt-1">
                {profileData.title || formData.title || profile?.title || (profile as any)?.professional_title || 'Not set'}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Bio</p>
              <p className="font-medium whitespace-pre-wrap mt-1">
                {profileData.bio || formData.bio || profile?.bio || (profile as any)?.description || 'Not set'}
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Address</h3>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-chart-1" />
                Address
              </p>
              <p className="font-medium mt-1">
                {profileData.address || formData.location || (profile as any)?.address || profile?.location || 'Not set'}
              </p>
            </div>
          </div>

          {/* Skills */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Skills</h3>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mb-3">
                <Palette className="h-4 w-4 text-chart-2" />
                Art Specialties
              </p>
              {(selectedSkills.length > 0 || profileData.skills || formData.skills || profile?.skills) ? (
                <div className="flex flex-wrap gap-2">
                  {(selectedSkills.length > 0
                    ? selectedSkills
                    : profileData.skills
                    ? profileData.skills.split(',').map(s => s.trim()).filter(Boolean)
                    : formData.skills
                    ? formData.skills.split(',').map(s => s.trim()).filter(Boolean)
                    : (profile?.skills ? (Array.isArray(profile.skills) ? profile.skills : profile.skills.split(',').map((s: string) => s.trim()).filter(Boolean)) : [])
                  ).map((skill, index) => (
                    <div
                      key={index}
                      className="bg-primary/20 text-primary border border-primary/30 rounded-lg px-3 py-1 text-sm"
                    >
                      {skill}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No skills selected</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
