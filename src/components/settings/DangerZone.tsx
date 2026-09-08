'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

export function DangerZone() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch('/api/user/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to delete account.');
      }

      // Invalidate local client state
      try {
        await supabase.auth.signOut();
      } catch {}
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('supabase.auth.token');
      }

      toast.success('Account deleted successfully', {
        description: 'Your account and data have been permanently removed.',
      });

      // Hard redirect to clear all in-memory React state and cached cookies
      window.location.href = '/login?deleted=true';
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      toast.error('Account Deletion Failed', {
        description: error?.message || 'Could not delete your account. Please try again or contact support.',
      });
      setIsDeleting(false);
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <Card className="border border-red-500/30 bg-red-950/10 shadow-xl backdrop-blur-xl">
        <CardHeader className="pb-3 border-b border-red-500/20">
          <CardTitle className="text-lg font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <span>Danger Zone</span>
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs sm:text-sm">
            Irreversible and destructive actions for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-red-950/20 border border-red-500/20">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white">Delete Account</h4>
              <p className="text-xs text-slate-400">
                Permanently remove your account, profile, and all associated personal data.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsModalOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-medium border border-red-500/40 shadow-lg shadow-red-600/20 shrink-0 cursor-pointer transition-all"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <AlertDialog open={isModalOpen} onOpenChange={(open) => !isDeleting && setIsModalOpen(open)}>
        <AlertDialogContent className="bg-slate-900 border border-red-500/30 text-white max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-white">
                Delete Account Permanently?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-300 leading-relaxed pt-1">
              Are you sure you want to delete your account? All your profile data, portfolio, and reviews will be deleted permanently. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-3 pt-4">
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => setIsModalOpen(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-0 font-medium cursor-pointer flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting Account...</span>
                </>
              ) : (
                <span>Yes, Delete My Account</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
