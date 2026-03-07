'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  MessageSquare,
  FileText,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type TeamMemberRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'VIEWER';

interface TeamMemberRecord {
  id: string;
  email: string;
  name?: string | null;
  role: TeamMemberRole;
  isActive: boolean;
  createdAt: string | Date;
  acceptedAt?: string | Date | null;
  invitationToken?: string | null;
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
    typeof record.isActive === 'boolean' &&
    (typeof record.createdAt === 'string' || record.createdAt instanceof Date)
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

export default function TeamCollaboration() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [selectedRole, setSelectedRole] = useState<TeamMemberRole>('VIEWER');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedInviteLink, setCopiedInviteLink] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: planSummary } = trpc.user.getPlanFeatures.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const hasTeamCollaboration = planSummary?.permissions.hasTeamCollaboration ?? false;

  // Fetch team members from backend
  const { data: teamMembers, isLoading: membersLoading, error: teamError } = trpc.team.list.useQuery(undefined, {
    enabled: hasTeamCollaboration,
    retry: false, // Don't retry on error
  });
  const teamMembersList = Array.isArray(teamMembers) ? teamMembers.filter(isTeamMemberRecord) : [];

  // Fetch activity logs from backend
  const { data: activityLogs } = trpc.team.getActivityLogs.useQuery(
    { limit: 10 },
    {
      enabled: hasTeamCollaboration,
      retry: false,
    }
  );
  const activityLogList = Array.isArray(activityLogs) ? activityLogs.filter(isTeamActivityLog) : [];

  // Invite mutation
  const inviteMutation = trpc.team.invite.useMutation({
    onSuccess: (data) => {
      toast.success('Invitation sent successfully', {
        description: `Invitation sent to ${inviteEmail}`,
      });

      // Copy invite link to clipboard
      if (data.invitationLink) {
        navigator.clipboard.writeText(data.invitationLink);
        toast.success('Invitation link copied to clipboard');
      }

      setInviteEmail('');
      setInviteName('');
      setSelectedRole('VIEWER');
      setShowInviteModal(false);
      utils.team.list.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to send invitation', {
        description: error.message,
      });
    },
  });

  // Remove member mutation
  const removeMutation = trpc.team.remove.useMutation({
    onSuccess: () => {
      toast.success('Team member removed successfully');
      utils.team.list.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to remove team member', {
        description: error.message,
      });
    },
  });

  const planTag =
    planSummary?.plan === 'CLIENT_ENTERPRISE'
      ? 'Enterprise Suite'
      : planSummary?.plan === 'CLIENT_BUSINESS'
        ? 'Business Plan'
        : 'Upgrade Required';

  const handleInviteTeamMember = () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    inviteMutation.mutate({
      email: inviteEmail,
      role: selectedRole,
      name: inviteName || undefined,
    });
  };

  const handleRemoveMember = (memberId: string, memberName?: string) => {
    if (confirm(`Are you sure you want to remove ${memberName || 'this member'}?`)) {
      removeMutation.mutate({ memberId });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-yellow-500/20 text-yellow-600';
      case 'ADMIN':
        return 'bg-blue-500/20 text-blue-400';
      case 'MANAGER':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatLastActive = (date?: string | Date | null) => {
    if (!date) return 'Never';
    const dateValue = date instanceof Date ? date : new Date(date);
    const diff = Date.now() - dateValue.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  // Show error state if there's a backend error
  if (teamError && !hasTeamCollaboration) {
    return (
      <div className="glass-card p-8 rounded-2xl text-center">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Team Collaboration</h3>
        <p className="text-muted-foreground mb-6">
          Upgrade to Business Plan to invite team members, assign roles, and collaborate on projects together.
        </p>
        <div className="space-y-3 text-sm text-muted-foreground mb-6">
          <div className="flex items-center justify-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span>Invite up to 2 team members (Business) or unlimited (Enterprise)</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Role-based permissions management</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Team activity tracking and collaboration</span>
          </div>
        </div>
        <Link
          href="/dashboard?tab=subscription"
          className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-colors font-medium"
        >
          <Crown className="h-4 w-4" />
          Upgrade to Business Plan
        </Link>
      </div>
    );
  }

  if (!hasTeamCollaboration) {
    return (
      <div className="glass-card p-8 rounded-2xl text-center">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Team Collaboration</h3>
        <p className="text-muted-foreground mb-6">
          Upgrade to Business Plan to invite team members, assign roles, and collaborate on projects together.
        </p>
        <div className="space-y-3 text-sm text-muted-foreground mb-6">
          <div className="flex items-center justify-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span>Invite up to 2 team members (Business) or unlimited (Enterprise)</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Role-based permissions management</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Team activity tracking and collaboration</span>
          </div>
        </div>
        <Link
          href="/dashboard?tab=subscription"
          className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-colors font-medium"
        >
          <Crown className="h-4 w-4" />
          Upgrade to Business Plan
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Team Collaboration</h2>
          <div className="px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-600 text-xs font-medium rounded-full border border-yellow-500/30">
            {planTag}
          </div>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      {/* Team Members List */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-glass-border">
          <h3 className="text-lg font-semibold text-foreground">
            Team Members ({teamMembersList.length})
          </h3>
        </div>

        {membersLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading team members...</p>
          </div>
        ) : teamMembersList.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No team members yet. Start by inviting someone!</p>
          </div>
        ) : (
          <div className="divide-y divide-glass-border">
            {teamMembersList.map((member) => (
              <div key={member.id} className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                      {member.name
                        ? member.name
                            .split(' ')
                            .map((part) => part[0] ?? '')
                            .join('')
                        : member.email[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">
                        {member.name || member.email}
                        {!member.isActive && (
                          <span className="ml-2 text-xs text-yellow-500">(Pending)</span>
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(member.role)}`}>
                          {member.role}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {member.isActive
                            ? `Joined ${new Date(member.acceptedAt || member.createdAt).toLocaleDateString()}`
                            : `Invited ${new Date(member.createdAt).toLocaleDateString()}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {member.role !== 'OWNER' && (
                      <div className="flex items-center gap-1">
                        {!member.isActive && member.invitationToken && (
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/team/join/${member.invitationToken}`;
                              navigator.clipboard.writeText(link);
                              setCopiedInviteLink(member.id);
                              setTimeout(() => setCopiedInviteLink(null), 2000);
                              toast.success('Invitation link copied');
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Copy invitation link"
                          >
                            {copiedInviteLink === member.id ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(member.id, member.name || member.email)}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                          disabled={removeMutation.isPending}
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Activity */}
      {activityLogList.length > 0 && (
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Team Activity</h3>
          <div className="space-y-4">
            {activityLogList.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-foreground">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatLastActive(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold text-foreground mb-6">Invite Team Member</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2 bg-transparent border border-glass-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 bg-transparent border border-glass-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as TeamMemberRole)}
                  className="w-full px-3 py-2 bg-transparent border border-glass-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="VIEWER">Viewer (Read-only access)</option>
                  <option value="MANAGER">Manager (Can manage projects)</option>
                  <option value="ADMIN">Admin (Can edit & invite)</option>
                </select>
              </div>

              <div className="text-sm text-muted-foreground">
                {selectedRole === 'VIEWER' && 'Viewers can view project details and participate in discussions.'}
                {selectedRole === 'MANAGER' && 'Managers can manage projects, milestones, and files.'}
                {selectedRole === 'ADMIN' && 'Admins have full access except billing and cannot remove the owner.'}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteName('');
                  setSelectedRole('VIEWER');
                }}
                className="flex-1 px-4 py-2 glass-button border border-glass-border rounded-lg hover:scale-105 transition-transform"
                disabled={inviteMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleInviteTeamMember}
                disabled={!inviteEmail || inviteMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
