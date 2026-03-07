'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Mail, Shield, Trash2, Users, Activity } from 'lucide-react';
import { toast } from 'sonner';

type TeamMemberRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'VIEWER';

interface TeamMemberRecord {
  id: string;
  email: string;
  name?: string | null;
  role: TeamMemberRole;
  isActive: boolean;
  acceptedAt?: string | Date | null;
}

interface TeamActivityLog {
  id: string;
  action: string;
  createdAt: string | Date;
}

const isTeamMemberRecord = (value: unknown): value is TeamMemberRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.email === 'string' &&
    typeof record.role === 'string' &&
    ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'].includes(record.role) &&
    typeof record.isActive === 'boolean'
  );
};

const isTeamActivityLog = (value: unknown): value is TeamActivityLog => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.action === 'string' &&
    (typeof record.createdAt === 'string' || record.createdAt instanceof Date)
  );
};

export default function TeamPage() {
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMemberRole>('VIEWER');

  const utils = trpc.useUtils();

  // Queries
  const { data: members, isLoading: membersLoading } = trpc.team.list.useQuery();
  const { data: logs } = trpc.team.getActivityLogs.useQuery({ limit: 20 });
  const teamMembers = Array.isArray(members) ? members.filter(isTeamMemberRecord) : [];
  const activityLogs = Array.isArray(logs) ? logs.filter(isTeamActivityLog) : [];

  // Mutations
  const inviteMutation = trpc.team.invite.useMutation({
    onSuccess: (data) => {
      toast.success('Invitation sent successfully!', {
        description: `An invitation has been sent to ${inviteEmail}`,
      });
      setIsInviting(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('VIEWER');
      utils.team.list.invalidate();

      // Show invitation link
      if (data.invitationLink) {
        toast.info('Invitation Link Generated', {
          description: 'Click to copy the invitation link',
          action: {
            label: 'Copy Link',
            onClick: () => {
              navigator.clipboard.writeText(data.invitationLink);
              toast.success('Link copied to clipboard');
            },
          },
          duration: 10000,
        });
      }
    },
    onError: (error) => {
      toast.error('Failed to send invitation', {
        description: error.message,
      });
    },
  });

  const updateRoleMutation = trpc.team.updateRole.useMutation({
    onSuccess: () => {
      toast.success('Member role updated');
      utils.team.list.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to update role', {
        description: error.message,
      });
    },
  });

  const removeMutation = trpc.team.remove.useMutation({
    onSuccess: () => {
      toast.success('Team member removed');
      utils.team.list.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to remove member', {
        description: error.message,
      });
    },
  });

  const handleInvite = () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    inviteMutation.mutate({
      email: inviteEmail,
      name: inviteName || undefined,
      role: inviteRole,
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'MANAGER':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Team Management</h1>
        <p className="text-muted-foreground">
          Invite team members and manage access to your organization.
        </p>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          {/* Invite Form */}
          {isInviting ? (
            <Card>
              <CardHeader>
                <CardTitle>Invite Team Member</CardTitle>
                <CardDescription>
                  Send an invitation to join your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
          <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as TeamMemberRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">Viewer - Can view jobs</SelectItem>
                      <SelectItem value="MANAGER">Manager - Can manage jobs</SelectItem>
                      <SelectItem value="ADMIN">Admin - Full access except billing</SelectItem>
                      <SelectItem value="OWNER">Owner - Full access including billing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleInvite}
                    disabled={inviteMutation.isPending}
                  >
                    {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsInviting(false);
                      setInviteEmail('');
                      setInviteName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setIsInviting(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Team Member
            </Button>
          )}

          {/* Team Members List */}
          {membersLoading ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">Loading team members...</p>
              </CardContent>
            </Card>
          ) : teamMembers.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Team Members ({teamMembers.length})</CardTitle>
                <CardDescription>
                  People who have access to your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.map((member) => {
                    const isActive = member.isActive && Boolean(member.acceptedAt);

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <Avatar>
                            <AvatarFallback>
                              {(member.name || member.email)?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="font-medium">
                              {member.name || 'Pending'}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <Badge className={getRoleBadgeColor(member.role)}>
                                <Shield className="h-3 w-3 mr-1" />
                                {member.role}
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Mail className="h-3 w-3 mr-1" />
                                Invited
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isActive && (
                            <Select
                              value={member.role}
                              onValueChange={(newRole) =>
                                updateRoleMutation.mutate({
                                  memberId: member.id,
                                  role: newRole as TeamMemberRole,
                                })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="VIEWER">Viewer</SelectItem>
                                <SelectItem value="MANAGER">Manager</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                                <SelectItem value="OWNER">Owner</SelectItem>
                              </SelectContent>
                            </Select>
                          )}

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to remove this team member?')) {
                                removeMutation.mutate({ memberId: member.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">No team members yet</p>
                  <Button onClick={() => setIsInviting(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Your First Team Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Recent team activity and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLogs.length > 0 ? (
                <div className="space-y-3">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border-l-2 border-purple-600">
                      <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm">{log.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No activity logs yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
