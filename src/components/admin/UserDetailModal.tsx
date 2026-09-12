'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Briefcase,
  FileText,
  CheckCircle,
  XCircle,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatRole, getRoleBadgeClass } from '@/lib/utils';

interface UserDetailModalProps {
  userId: string;
  onClose: () => void;
  onUpdate: () => void;
}

type EditableUserRole = 'FREELANCER' | 'CLIENT' | 'ADMIN';

interface EditableUserFields {
  email?: string;
  role?: EditableUserRole;
  isVerified?: boolean;
}

export default function UserDetailModal({ userId, onClose, onUpdate }: UserDetailModalProps) {
  const [editData, setEditData] = useState<EditableUserFields>({});

  const { data: user, isLoading } = trpc.admin.users.getUserById.useQuery({ userId });
  const { data: stats } = trpc.admin.users.getUserStats.useQuery({ userId });

  const updateMutation = trpc.admin.users.updateUser.useMutation({
    onSuccess: () => {
      toast.success('User updated successfully');
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update user');
    },
  });

  if (isLoading || !user) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const profile = Array.isArray(user.Profile) ? user.Profile[0] : user.Profile;
  const firstName = profile?.firstName || profile?.first_name || '';
  const lastName = profile?.lastName || profile?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'User';

  const handleSave = () => {
    updateMutation.mutate({
      userId,
      ...editData,
    });
  };

  const getRoleBadge = (role: string) => {
    return getRoleBadgeClass(role);
  };

  const getPlanBadge = (plan: string) => {
    return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-white"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div>{fullName}</div>
              <DialogDescription className="text-slate-400 text-xs font-normal">
                {user.email} • {user.role}
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-3">
            {/* Quick Info Bar */}
            <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-white/10">
              {user.role !== 'CLIENT' && (
                user.isVerified ? (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                    <XCircle className="h-3 w-3 mr-1" />
                    Unverified
                  </Badge>
                )
              )}
              <Badge className={getRoleBadge(user.role)}>
                {formatRole(user.role)}
              </Badge>
              {stats && (
                <>
                  {(user.role === 'CLIENT' || user.role === 'ADMIN') && (
                    <Badge variant="outline" className="border-blue-400/30 text-blue-300">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {stats.jobsPosted} Jobs
                    </Badge>
                  )}
                  {(formatRole(user.role) === 'ARTIST' || user.role === 'ADMIN') && (
                    <Badge variant="outline" className="border-green-400/30 text-green-300">
                      <FileText className="h-3 w-3 mr-1" />
                      {stats.proposalsSubmitted} Proposals
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Profile Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">
                {formatRole(user.role) === 'ARTIST' ? 'Artist Profile' :
                 user.role === 'CLIENT' ? 'Client Details' :
                 'Account Information'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2.5 text-sm">
                <div>
                  <div className="text-slate-400 text-xs mb-0.5">Full Name</div>
                  <div className="text-white">{fullName}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-0.5">Email Address</div>
                  <div className="text-white truncate">{user.email}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-0.5">Account Created</div>
                  <div className="text-white">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-0.5">Last Active</div>
                  <div className="text-white">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Never logged in'}
                  </div>
                </div>

                {/* Artist-specific fields */}
                {formatRole(user.role) === 'ARTIST' && (
                  <>
                    {profile?.title && (
                      <div>
                        <div className="text-slate-400 text-xs mb-0.5">Job Title</div>
                        <div className="text-white">{profile.title}</div>
                      </div>
                    )}
                    {profile?.location && (
                      <div>
                        <div className="text-slate-400 text-xs mb-0.5">Location</div>
                        <div className="text-white">{profile.location}</div>
                      </div>
                    )}
                    {profile?.rate && (
                      <div>
                        <div className="text-slate-400 text-xs mb-0.5">Hourly Rate</div>
                        <div className="text-white">${profile.rate}/hour</div>
                      </div>
                    )}
                    {profile?.portfolio && (
                      <div className="md:col-span-2">
                        <div className="text-slate-400 text-xs mb-0.5">Portfolio</div>
                        <div className="text-white truncate">
                          <a
                            href={profile.portfolio}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            {profile.portfolio}
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Client-specific fields */}
                {user.role === 'CLIENT' && (
                  <>
                    {(profile?.phone || profile?.businessPhone) && (
                      <div>
                        <div className="text-slate-400 text-xs mb-0.5">WhatsApp / Phone</div>
                        <div className="text-white">{profile.phone || profile.businessPhone}</div>
                      </div>
                    )}
                    {(profile?.location || profile?.businessAddressLine1) && (
                      <div>
                        <div className="text-slate-400 text-xs mb-0.5">Address</div>
                        <div className="text-white">{profile.location || profile.businessAddressLine1}</div>
                      </div>
                    )}
                    {profile?.businessEmail && profile.businessEmail !== user.email && (
                      <div>
                        <div className="text-slate-400 text-xs mb-0.5">Contact Email</div>
                        <div className="text-white">{profile.businessEmail}</div>
                      </div>
                    )}
                  </>
                )}

                {/* Admin or users without specific fields */}
                {formatRole(user.role) !== 'ARTIST' && user.role !== 'CLIENT' && profile?.location && (
                  <div>
                    <div className="text-slate-400 text-xs mb-0.5">Location</div>
                    <div className="text-white">{profile.location}</div>
                  </div>
                )}

                <div className="md:col-span-3">
                  <div className="text-slate-400 text-xs mb-0.5">User ID</div>
                  <div className="text-white font-mono text-xs break-all">{user.id}</div>
                </div>
              </div>

              {/* Artist Skills */}
              {formatRole(user.role) === 'ARTIST' && profile?.skills && (
                <div className="pt-2.5 border-t border-white/10">
                  <div className="text-slate-400 text-xs mb-1">Skills</div>
                  <div className="text-white text-sm leading-relaxed">{profile.skills}</div>
                </div>
              )}

              {/* Artist Experience */}
              {formatRole(user.role) === 'ARTIST' && profile?.experience && (
                <div className="pt-2.5 border-t border-white/10">
                  <div className="text-slate-400 text-xs mb-1">Experience</div>
                  <div className="text-white text-sm leading-relaxed whitespace-pre-line">{profile.experience}</div>
                </div>
              )}

              {/* Artist Education */}
              {formatRole(user.role) === 'ARTIST' && profile?.education && (
                <div className="pt-2.5 border-t border-white/10">
                  <div className="text-slate-400 text-xs mb-1">Education</div>
                  <div className="text-white text-sm leading-relaxed whitespace-pre-line">{profile.education}</div>
                </div>
              )}

              {/* Client Company Info */}
              {user.role === 'CLIENT' && profile?.companyInfo && (
                <div className="pt-2.5 border-t border-white/10">
                  <div className="text-slate-400 text-xs mb-1">Company Information</div>
                  <div className="text-white text-sm leading-relaxed">{profile.companyInfo}</div>
                </div>
              )}

              {/* Bio (for all roles) */}
              {profile?.bio && (
                <div className="pt-2.5 border-t border-white/10">
                  <div className="text-slate-400 text-xs mb-1">Bio</div>
                  <div className="text-white text-sm leading-relaxed">{profile.bio}</div>
                </div>
              )}
            </div>

          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-3">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Edit User Settings</h3>
                <p className="text-xs text-slate-400 mb-4">Update user account settings and permissions</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white text-sm">Email</Label>
                  <Input
                    type="email"
                    defaultValue={user.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="bg-white/5 border-white/10 text-white mt-1.5"
                  />
                </div>

                <div>
                  <Label className="text-white text-sm">Role</Label>
                  <Select
                    defaultValue={user.role}
                    onValueChange={(value) =>
                      setEditData({ ...editData, role: value as EditableUserRole })
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="FREELANCER">Artist</SelectItem>
                      <SelectItem value="CLIENT">Client</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {user.role !== 'CLIENT' && (
                  <div>
                    <Label className="text-white text-sm">Verification Status</Label>
                    <Select
                      defaultValue={user.isVerified ? 'true' : 'false'}
                      onValueChange={(value) => setEditData({ ...editData, isVerified: value === 'true' })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="true">Verified</SelectItem>
                        <SelectItem value="false">Unverified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditData({});
                  }}
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
