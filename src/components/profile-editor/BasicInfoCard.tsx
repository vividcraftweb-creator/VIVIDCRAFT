'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import SkillsSelector from '@/components/ui/skills-selector';
import LocationAutocompleteInput from '@/components/ui/LocationAutocompleteInput';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Briefcase, MapPin, DollarSign, Code, Edit, Save, X, Camera, Lightbulb, Sparkles, Upload } from 'lucide-react';
import { type Profile } from '@/types/database.types';
import { CharacterCount } from '@/components/ui/character-count';
import { FIELD_LIMITS, TITLE_EXAMPLES, BIO_TIPS } from '@/types/profile-editor.types';
import { useFileDragDrop } from '@/hooks/useFileDragDrop';
import { getProfilePictureUrl, getProfilePictureUrlWithTimestamp } from '@/lib/profile-helpers';

interface BasicInfoCardProps {
  profile: Profile | null | undefined;
  onUpdate: () => void;
}

export default function BasicInfoCard({ profile, onUpdate }: BasicInfoCardProps) {
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    title: '',
    bio: '',
    location: '',
    skills: '',
    rate: '',
    profilePicture: '',
  });
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [lastUploadTimestamp, setLastUploadTimestamp] = useState<number>(0);
  const profileInitials = (
    (profile?.firstName?.[0] || '') + (profile?.lastName?.[0] || '')
  ).toUpperCase() || 'U';
  const profilePictureUrl = getProfilePictureUrl(profile?.userId, profile?.profilePicture) || '';

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
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        title: profile.title || '',
        bio: profile.bio || '',
        location: profile.location || '',
        skills: profile.skills || '',
        rate: profile.rate?.toString() || '',
        profilePicture: profile.profilePicture || '',
      });

      // Parse existing skills from comma-separated string
      if (profile.skills) {
        const skillsArray = profile.skills.split(',').map(skill => skill.trim()).filter(skill => skill);
        setSelectedSkills(skillsArray);
      } else {
        setSelectedSkills([]);
      }
    }
  }, [profile]);

  const updateMutation = trpc.publicProfile.updateBasicInfo.useMutation({
    onSuccess: () => {
      toast.success('Basic information updated successfully!');
      setIsEditing(false);
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to update basic information', {
        description: error.message,
      });
    },
  });

  const uploadDocumentMutation = trpc.documents.uploadDocument.useMutation({
    onSuccess: (data) => {
      // Use the actual filename with timestamp that was saved
      if (data) {
        setFormData(prev => ({ ...prev, profilePicture: data.fileName }));

        // Invalidate profile query to trigger refresh
        utils.publicProfile.getMyFullProfile.invalidate();

        // Set timestamp for cache-busting
        setLastUploadTimestamp(Date.now());
      }
      setIsUploadingPicture(false);
      toast.success('Profile picture uploaded successfully!');
    },
    onError: (error) => {
      setIsUploadingPicture(false);
      toast.error('Failed to upload profile picture', {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      title: formData.title || undefined,
      bio: formData.bio || undefined,
      location: formData.location || undefined,
      skills: selectedSkills.length > 0 ? selectedSkills.join(', ') : undefined,
      rate: formData.rate ? parseFloat(formData.rate) : undefined,
      profilePicture: formData.profilePicture || undefined,
    });
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
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are allowed');
      return;
    }

    setIsUploadingPicture(true);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);

      await uploadDocumentMutation.mutateAsync({
        type: 'PORTFOLIO_ITEM', // Using PORTFOLIO_ITEM type for profile pictures
        fileName: file.name,
        fileData: base64,
        fileSize: file.size,
        mimeType: file.type,
      });
    } catch (error) {
      setIsUploadingPicture(false);
      // Error handled by mutation onError
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:mime/type;base64, prefix
      };
      reader.onerror = error => reject(error);
    });
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
        rate: profile.rate?.toString() || '',
        profilePicture: profile.profilePicture || '',
      });

      // Reset skills
      if (profile.skills) {
        const skillsArray = profile.skills.split(',').map(skill => skill.trim()).filter(skill => skill);
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
                      formData.profilePicture && profile?.userId
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
                placeholder="e.g., Graphic Designer, Content Writer, Social Media Manager"
                className="bg-background/50"
                maxLength={FIELD_LIMITS.TITLE.max}
              />
              <CharacterCount
                current={formData.title.length}
                min={FIELD_LIMITS.TITLE.min}
                max={FIELD_LIMITS.TITLE.max}
                ideal={FIELD_LIMITS.TITLE.ideal}
              />

              {/* Example Titles - Progressive Disclosure */}
              {formData.title.length < 5 && (
                <div className="glass-card p-4 rounded-2xl border border-primary/20 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground">Example professional titles:</span>
                  </div>
                  <div className="space-y-1.5 pl-6">
                    {TITLE_EXAMPLES['Development & IT'].map((example, i) => (
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
              )}
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

          {/* Location & Rate */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Location & Rate</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-chart-1" />
                  Location
                </Label>
                <LocationAutocompleteInput
                  id="location"
                  value={formData.location}
                  onChange={(value) => setFormData({ ...formData, location: value })}
                  placeholder="e.g., San Francisco, CA"
                  className="bg-background/50"
                  types={['(cities)']}
                />
                <p className="text-xs text-muted-foreground">
                  Start typing to search for your city
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-chart-4" />
                  Hourly Rate (USD)
                </Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  placeholder="50.00"
                  className="bg-background/50"
                />
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Skills</h3>

            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Code className="h-4 w-4 text-chart-2" />
                Select Your Skills
              </Label>
              
              <SkillsSelector
                selectedSkills={selectedSkills}
                onSkillsChange={setSelectedSkills}
                placeholder="Search and select skills..."
              />

              {/* Skills Counter and Validation */}
              <div className="flex items-center justify-between text-sm mt-2">
                <span className={selectedSkills.length === 0 ? 'text-destructive' : 'text-muted-foreground'}>
                  {selectedSkills.length === 0
                    ? 'Select at least 1 skill'
                    : `${selectedSkills.length} skill${selectedSkills.length !== 1 ? 's' : ''} selected`}
                </span>
                <span className="text-muted-foreground">Maximum 10 skills</span>
              </div>

              {/* Perfect Balance Feedback */}
              {selectedSkills.length >= 3 && selectedSkills.length <= 6 && (
                <div className="glass-card p-4 rounded-2xl border border-primary/30 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm">
                      <span className="font-medium text-primary">✨ Perfect balance!</span>
                      <span className="text-muted-foreground ml-2">
                        {selectedSkills.length} skills is ideal for attracting the right clients without overwhelming them.
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Too Many Skills Warning */}
              {selectedSkills.length > 6 && selectedSkills.length <= 10 && (
                <div className="glass-card p-4 rounded-2xl border border-amber-500/30 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Consider focusing on your core strengths. Clients often prefer specialists over generalists.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={updateMutation.isPending} className="glass-button hover-lift interactive-scale flex-1 sm:flex-none">
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
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
                <AvatarImage src={profilePictureUrl || undefined} />
                <AvatarFallback className="text-lg">
                  {profileInitials}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm text-muted-foreground">
                {profilePictureUrl ? (
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
                <p className="font-medium">{profile?.firstName || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Name</p>
                <p className="font-medium">{profile?.lastName || 'Not set'}</p>
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
              <p className="font-medium mt-1">{profile?.title || 'Not set'}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Bio</p>
              <p className="font-medium whitespace-pre-wrap mt-1">{profile?.bio || 'Not set'}</p>
            </div>
          </div>

          {/* Location & Rate */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Location & Rate</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-chart-1" />
                  Location
                </p>
                <p className="font-medium mt-1">{profile?.location || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-chart-4" />
                  Hourly Rate
                </p>
                <p className="font-medium mt-1">
                  {profile?.rate ? `$${profile.rate}/hr` : 'Not set'}
                </p>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Skills</h3>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mb-3">
                <Code className="h-4 w-4 text-chart-2" />
                Skills
              </p>
              {profile?.skills ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.split(',').map((skill, index) => (
                    <div
                      key={index}
                      className="bg-primary/20 text-primary border border-primary/30 rounded-lg px-3 py-1 text-sm"
                    >
                      {skill.trim()}
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
