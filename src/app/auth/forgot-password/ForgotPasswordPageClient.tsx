'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Email is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        toast.success('Reset link sent!', {
          description: 'Check your email for the password reset link.'
        });
      } else {
        toast.error('Error', {
          description: data.message || 'Something went wrong. Please try again.'
        });
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-xl text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-4">Check Your Email</h1>
            <p className="text-gray-300 mb-6">
              If an account with that email exists, we&apos;ve sent you a password reset link.
            </p>
            <p className="text-gray-400 text-sm mb-8">
              Didn&apos;t receive the email? Check your spam folder or try again.
            </p>
            <div className="space-y-4">
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                variant="outline"
                className="w-full h-11 bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors rounded-lg"
              >
                Try Different Email
              </Button>
              <Link href="/auth/signin">
                <Button
                  variant="ghost"
                  className="w-full h-11 text-gray-300 hover:text-white hover:bg-white/5 transition-colors rounded-lg"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white mb-2">Reset Your Password</h1>
          <p className="text-gray-400">Enter your email to receive a reset link</p>
        </div>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-200 text-sm font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-white text-gray-900 hover:bg-gray-100 font-medium rounded-lg transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-900 rounded-full animate-spin" />
                  Sending Reset Link...
                </div>
              ) : (
                'Send Reset Link'
              )}
            </Button>

            <div className="text-center pt-4 border-t border-white/10">
              <Link 
                href="/auth/signin"
                className="text-gray-400 hover:text-white transition-colors text-sm inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </form>
        </div>

        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 2025 JobHorizons</p>
        </div>
      </div>
    </div>
  );
}