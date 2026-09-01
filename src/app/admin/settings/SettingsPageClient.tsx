'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Mail, Shield, Zap, Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';

export default function AdminSettingsPage() {
  // Get settings from database
  const { data: savedSettings, isLoading } = trpc.admin.settings.getSettings.useQuery();
  const updateSettingsMutation = trpc.admin.settings.updateSettings.useMutation({
    onSuccess: () => {
      toast.success('Settings saved successfully!', {
        description: 'Your changes have been applied.',
        icon: <CheckCircle className="h-4 w-4" />,
      });
    },
    onError: (error) => {
      toast.error('Failed to save settings', {
        description: error.message,
      });
    },
  });

  // General Settings State
  const [platformName, setPlatformName] = useState('Vivid Art');
  const [supportEmail, setSupportEmail] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [userRegistration, setUserRegistration] = useState(true);

  // Email Settings State
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');

  // Security Settings State
  const [require2FA, setRequire2FA] = useState(false);
  const [autoBanSuspicious, setAutoBanSuspicious] = useState(true);

  // Feature Flags State
  const [aiRecommendations, setAiRecommendations] = useState(true);
  const [videoInterviews, setVideoInterviews] = useState(false);
  const [teamCollaboration, setTeamCollaboration] = useState(true);

  // Load settings from database when available
  useEffect(() => {
    if (savedSettings) {
      setPlatformName(savedSettings.general.platformName);
      setSupportEmail(savedSettings.general.supportEmail);
      setMaintenanceMode(savedSettings.general.maintenanceMode);
      setUserRegistration(savedSettings.general.userRegistration);
      setSmtpHost(savedSettings.email.smtpHost);
      setSmtpPort(savedSettings.email.smtpPort);
      setRequire2FA(savedSettings.security.require2FA);
      setAutoBanSuspicious(savedSettings.security.autoBanSuspicious);
      setAiRecommendations(savedSettings.features.aiRecommendations);
      setVideoInterviews(savedSettings.features.videoInterviews);
      setTeamCollaboration(savedSettings.features.teamCollaboration);
    }
  }, [savedSettings]);

  const handleSaveSettings = async () => {
    const settings = {
      general: {
        platformName,
        supportEmail,
        maintenanceMode,
        userRegistration,
      },
      email: {
        smtpHost,
        smtpPort,
      },
      security: {
        require2FA,
        autoBanSuspicious,
      },
      features: {
        aiRecommendations,
        videoInterviews,
        teamCollaboration,
      },
    };

    await updateSettingsMutation.mutateAsync(settings);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-white/5 rounded w-1/4"></div>
          <div className="h-12 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center gap-2.5">
        <Settings className="h-5 w-5 text-blue-400" />
        <h1 className="text-xl font-bold text-white">System Settings</h1>
      </div>

      {/* General Settings */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            General Settings
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Basic platform configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white text-xs">Platform Name</Label>
              <Input
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="bg-white/5 border-white/10 text-white h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white text-xs">Support Email</Label>
              <Input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium text-sm">Maintenance Mode</div>
              <div className="text-xs text-slate-400">Temporarily disable public access</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium text-sm">User Registration</div>
              <div className="text-xs text-slate-400">Allow new user signups</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={userRegistration}
                onChange={(e) => setUserRegistration(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Email Settings
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Configure email notifications and SMTP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white text-xs">SMTP Host</Label>
              <Input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.example.com"
                className="bg-white/5 border-white/10 text-white h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white text-xs">SMTP Port</Label>
              <Input
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
                className="bg-white/5 border-white/10 text-white h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Security Settings
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Platform security configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium text-sm">Two-Factor Authentication</div>
              <div className="text-xs text-slate-400">Require 2FA for all admin accounts</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={require2FA}
                onChange={(e) => setRequire2FA(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium text-sm">Auto-ban Suspicious Activity</div>
              <div className="text-xs text-slate-400">Automatically suspend flagged accounts</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoBanSuspicious}
                onChange={(e) => setAutoBanSuspicious(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Feature Flags
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Enable or disable platform features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium text-sm">AI Recommendations</div>
              <div className="text-xs text-slate-400">Enable AI-powered job matching</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiRecommendations}
                onChange={(e) => setAiRecommendations(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium text-sm">Video Interviews</div>
              <div className="text-xs text-slate-400">Enable video interview scheduling</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={videoInterviews}
                onChange={(e) => setVideoInterviews(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium text-sm">Team Collaboration</div>
              <div className="text-xs text-slate-400">Allow business accounts to add team members</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={teamCollaboration}
                onChange={(e) => setTeamCollaboration(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={updateSettingsMutation.isPending}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 h-8 px-3 text-xs"
        >
          {updateSettingsMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
