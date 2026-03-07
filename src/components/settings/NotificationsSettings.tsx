'use client';

import { useState, useEffect } from 'react';
import { useAuth as useSession } from '@/hooks/useAuth';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, MessageSquare, Briefcase, Award } from 'lucide-react';

type NotificationPreferences = {
  emailNotifications: boolean;
  newProposals: boolean;
  proposalUpdates: boolean;
  newMessages: boolean;
  interviewScheduled: boolean;
  jobStatusChanges: boolean;
  weeklyTokens: boolean;
  marketingEmails: boolean;
};

export function NotificationsSettings() {
  const { data: session } = useSession();
  const userRole = session?.session?.user?.role;
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    newProposals: true,
    proposalUpdates: true,
    newMessages: true,
    interviewScheduled: true,
    jobStatusChanges: true,
    weeklyTokens: true,
    marketingEmails: false,
  });

  const { data: userPreferences, isLoading } = trpc.user.getNotificationPreferences.useQuery(undefined, {
    enabled: !!session,
  });

  const updatePreferencesMutation = trpc.user.updateNotificationPreferences.useMutation({
    onSuccess: () => {
      toast.success('Notification preferences updated successfully.');
    },
    onError: (error) => {
      toast.error('Failed to update preferences', { description: error.message });
    },
  });

  useEffect(() => {
    if (userPreferences) {
      setPreferences(userPreferences as NotificationPreferences);
    }
  }, [userPreferences]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferencesMutation.mutate(preferences);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Loading preferences...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
        <CardDescription>
          Manage how you receive notifications and updates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Master Email Toggle */}
          <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-3 flex-1">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="emailNotifications" className="text-base font-semibold cursor-pointer">
                  Email Notifications
                </Label>
                <p className="text-sm text-slate-400 mt-1">
                  Enable or disable all email notifications
                </p>
              </div>
            </div>
            <Switch
              id="emailNotifications"
              checked={preferences.emailNotifications}
              onCheckedChange={() => handleToggle('emailNotifications')}
            />
          </div>

          <Separator />

          {/* Job & Proposal Notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Jobs & Proposals
            </h3>

            <div className="space-y-4 ml-6">
              {/* Client-only: New Proposals */}
              {userRole === 'CLIENT' && (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="newProposals" className="cursor-pointer">
                      New Proposals
                    </Label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Get notified when freelancers submit proposals on your jobs
                    </p>
                  </div>
                  <Switch
                    id="newProposals"
                    checked={preferences.newProposals}
                    onCheckedChange={() => handleToggle('newProposals')}
                    disabled={!preferences.emailNotifications}
                  />
                </div>
              )}

              {/* Freelancer-only: Proposal Updates */}
              {userRole === 'FREELANCER' && (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="proposalUpdates" className="cursor-pointer">
                      Proposal Updates
                    </Label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Status changes on proposals you&apos;ve submitted
                    </p>
                  </div>
                  <Switch
                    id="proposalUpdates"
                    checked={preferences.proposalUpdates}
                    onCheckedChange={() => handleToggle('proposalUpdates')}
                    disabled={!preferences.emailNotifications}
                  />
                </div>
              )}

              {/* Client-only: Job Status Changes */}
              {userRole === 'CLIENT' && (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="jobStatusChanges" className="cursor-pointer">
                      Job Status Changes
                    </Label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      When your posted jobs are opened, closed, or paused
                    </p>
                  </div>
                  <Switch
                    id="jobStatusChanges"
                    checked={preferences.jobStatusChanges}
                    onCheckedChange={() => handleToggle('jobStatusChanges')}
                    disabled={!preferences.emailNotifications}
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Communication Notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Communication
            </h3>

            <div className="space-y-4 ml-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="newMessages" className="cursor-pointer">
                    New Messages
                  </Label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    When you receive new direct messages
                  </p>
                </div>
                <Switch
                  id="newMessages"
                  checked={preferences.newMessages}
                  onCheckedChange={() => handleToggle('newMessages')}
                  disabled={!preferences.emailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="interviewScheduled" className="cursor-pointer">
                    Interview Scheduled
                  </Label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Interview invitations and reminders
                  </p>
                </div>
                <Switch
                  id="interviewScheduled"
                  checked={preferences.interviewScheduled}
                  onCheckedChange={() => handleToggle('interviewScheduled')}
                  disabled={!preferences.emailNotifications}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Platform Updates */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Platform Updates
            </h3>

            <div className="space-y-4 ml-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="weeklyTokens" className="cursor-pointer">
                    Weekly Token Refresh
                  </Label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Reminder when your free weekly tokens are available
                  </p>
                </div>
                <Switch
                  id="weeklyTokens"
                  checked={preferences.weeklyTokens}
                  onCheckedChange={() => handleToggle('weeklyTokens')}
                  disabled={!preferences.emailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="marketingEmails" className="cursor-pointer">
                    Marketing & Updates
                  </Label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Product updates, tips, and promotional offers
                  </p>
                </div>
                <Switch
                  id="marketingEmails"
                  checked={preferences.marketingEmails}
                  onCheckedChange={() => handleToggle('marketingEmails')}
                  disabled={!preferences.emailNotifications}
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={updatePreferencesMutation.isPending}>
              {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
