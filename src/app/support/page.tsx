import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  Mail,
  HelpCircle,
  Users
} from 'lucide-react';
import TicketForm from '@/components/support/TicketForm';

export default async function SupportPage() {
  const session = await auth();

  // Server-side redirect for unauthenticated users
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/support');
  }

  // Check email verification (bypassed for Google OAuth / confirmed users)
  const isGoogleOrConfirmed =
    (session.user as any)?.app_metadata?.provider === 'google' ||
    (session.user as any)?.user_metadata?.isVerified === true ||
    (session.user as any)?.email_confirmed_at;

  if (!isGoogleOrConfirmed) {
    const supabase = await createClient();
    const { data: user } = await supabase
      .from('User')
      .select('isVerified')
      .eq('id', session.user.id)
      .single();

    if (user && user.isVerified === false) {
      redirect('/auth/verify-email');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/90">
      {/* Hero Section */}
      <div className="pt-6 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Get <span className="text-gradient">Support</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Submit a ticket below and we&apos;ll respond within 24 hours
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
        {/* Ticket Form Section */}
        <section className="mb-12">
          <div className="max-w-3xl mx-auto">
            <TicketForm />
          </div>
        </section>

        {/* Common Questions */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Common <span className="text-gradient">Questions</span>
            </h2>
            <p className="text-muted-foreground">
              Quick answers to frequently asked questions
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                For Freelancers
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-1">How do application tokens work?</h4>
                  <p className="text-muted-foreground text-sm">
                    You get 150 tokens every week (refreshed Monday). Bid the amount you want on each application so higher bids place you closer to the top of the client&apos;s review queue.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">How do I get verified?</h4>
                  <p className="text-muted-foreground text-sm">
                    Complete your profile with accurate information and submit required documents. Verification typically takes 24-48 hours.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">When do I get paid?</h4>
                  <p className="text-muted-foreground text-sm">
                    Arrange payment directly with your client once milestones are completed. We recommend using trusted services like PayPal or Wise.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                For Clients
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-1">How do I find quality freelancers?</h4>
                  <p className="text-muted-foreground text-sm">
                    All freelancers are verified and our token system ensures you only receive thoughtful, relevant applications from interested professionals.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">What are the fees?</h4>
                  <p className="text-muted-foreground text-sm">
                    Service fees start at 5% for basic plans and go down to 3% for business clients. Check our pricing page for details.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">How is my payment protected?</h4>
                  <p className="text-muted-foreground text-sm">
                    Agree on milestones in writing, request regular progress updates, and release payment externally once satisfied with the work.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section>
          <div className="glass-card p-8 rounded-xl text-center max-w-2xl mx-auto">
            <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-foreground mb-3">
              Need Additional Help?
            </h3>
            <p className="text-muted-foreground mb-6">
              Can&apos;t find what you&apos;re looking for? Our support team is here to help.
            </p>
            <div className="space-y-3">
              <a
                href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@yourdomain.com'}`}
                className="block text-lg font-medium text-primary hover:underline"
              >
                {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@yourdomain.com'}
              </a>
              <p className="text-sm text-muted-foreground">
                Response time: Within 24 hours
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
