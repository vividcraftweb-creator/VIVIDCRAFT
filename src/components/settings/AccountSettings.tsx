'use client';

import { useState, useEffect } from 'react';
import { useAuth as useSession } from '@/hooks/useAuth';
import { trpc } from '@/utils/trpc';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AccountSettings() {
  const { data: session, update } = useSession();
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (session.session?.user?.email) {
      setEmail(session.session.user.email);
    }
  }, [session]);

  // TODO: Re-enable when updateAccount mutation is implemented
  const updateAccountMutation = {
    mutate: (data: { email: string }) => {
      toast.error('Account updates not yet available');
    },
    isPending: false,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAccountMutation.mutate({ email });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Manage your account settings and email address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-slate-800/50 cursor-not-allowed opacity-60"
            />
            <p className="text-xs text-slate-400">
              Your email address cannot be changed. Contact support if you need to update your email.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
