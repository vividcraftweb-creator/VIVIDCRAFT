'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { NotificationsSettings } from '@/components/settings/NotificationsSettings';
import { Settings } from 'lucide-react';

export default function SettingsView() {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Settings className="h-7 w-7 text-blue-400" />
            Settings
          </h2>
          <p className="text-slate-400">Manage your account preferences and security</p>
        </div>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="bg-slate-950 border border-slate-800 p-1 w-full sm:w-auto">
            <TabsTrigger
              value="account"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              Account
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              Security
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              Notifications
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="account" className="m-0">
              <AccountSettings />
            </TabsContent>
            <TabsContent value="security" className="m-0">
              <SecuritySettings />
            </TabsContent>
            <TabsContent value="notifications" className="m-0">
              <NotificationsSettings />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
