'use client';

import Link from 'next/link';
import { useAuth as useSession } from '@/hooks/useAuth';
import { trpc } from '@/utils/trpc';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/data-table/DataTable';
import { type ColumnDef } from '@tanstack/react-table';
import type { Invoice, Contract, Job } from '@/types/database.types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  DollarSign,
  Handshake,
  CreditCard,
  FileText,
  HelpCircle,
  Link2,
  ArrowRight,
  Shield,
  MessageCircle,
} from 'lucide-react';

type InvoiceWithRelations = Invoice & {
  contract: Contract & { job: Job };
};

const invoiceColumns: ColumnDef<InvoiceWithRelations>[] = [
  {
    id: 'project',
    header: 'Project',
    accessorKey: 'contract.job.title',
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => `$${row.original.amount.toFixed(2)}`,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
  },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }) => new Date(row.original.dueDate).toLocaleDateString(),
  },
];

export default function BillingPage() {
  const { data: session } = useSession();
  const userRole = session?.session?.user?.role;
  const isClient = userRole === 'CLIENT';

  const {
    data: invoices,
    isLoading: invoicesLoading,
  } = trpc.invoices.getInvoicesForClient.useQuery(undefined, {
    enabled: isClient,
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Transparency Alert Banner */}
      <Alert className="border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur">
        <AlertTriangle className="h-6 w-6 text-amber-400" />
        <AlertTitle className="text-xl font-bold text-white">
          Important: JobHorizons Does Not Process Payments
        </AlertTitle>
        <AlertDescription className="text-base text-slate-200 space-y-2 mt-3">
          <p className="font-medium">
            JobHorizons is a <span className="text-amber-300 font-bold">connection platform only</span>.
            We do not hold, process, or transfer funds between clients and freelancers.
          </p>
          <p>
            All payment arrangements, invoicing, and money transfers happen directly between you and your
            collaborator using your preferred external payment method.
          </p>
        </AlertDescription>
      </Alert>

      <PageHeader title="Billing & Payments" />

      {/* What We Do & Don't Do Comparison */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">Platform Scope & Capabilities</CardTitle>
          </div>
          <CardDescription>
            Understanding what JobHorizons provides and what you handle directly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* What We Provide Column */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                What JobHorizons Provides
              </h3>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Professional Connection Platform</p>
                    <p className="text-slate-400 mt-1">Job listings, profiles, and matching between clients & freelancers</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Secure Messaging System</p>
                    <p className="text-slate-400 mt-1">Direct communication tools with file sharing capabilities</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Project & Contract Tracking</p>
                    <p className="text-slate-400 mt-1">Milestone management, deliverable tracking, and documentation tools</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Invoice Generation</p>
                    <p className="text-slate-400 mt-1">Create professional invoices within the platform for record-keeping</p>
                  </div>
                </div>
              </div>
            </div>

            {/* What You Handle Directly Column */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                What You Handle Directly
              </h3>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <XCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Payment Processing</p>
                    <p className="text-slate-400 mt-1">JobHorizons never holds, processes, or transfers money between parties</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <XCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Payment Method Selection</p>
                    <p className="text-slate-400 mt-1">Choose your own payment provider (PayPal, Wise, bank transfer, etc.)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <XCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Payment Disputes & Refunds</p>
                    <p className="text-slate-400 mt-1">Handle payment issues directly with your collaborator and payment provider</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <XCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Tax Documentation & Compliance</p>
                    <p className="text-slate-400 mt-1">Manage your own tax reporting, invoicing compliance, and legal requirements</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <p className="text-sm text-slate-300">
              <Info className="h-4 w-4 inline-block mr-2 text-blue-400" />
              <strong className="text-white">Why this approach?</strong> By keeping payments separate,
              we eliminate platform fees, reduce transaction costs, and give you complete control over
              your financial relationships. You keep 100% of what you earn.
            </p>
          </div>
        </CardContent>
      </Card>

      {isClient ? (
        <Card className="glass-card border-white/10 bg-white/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Invoice History</CardTitle>
                <CardDescription className="mt-2">
                  Track invoices generated through JobHorizons. These are for record-keeping only.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-blue-500/30 text-blue-300 bg-blue-500/10">
                <FileText className="h-3 w-3 mr-1" />
                For Reference Only
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-slate-300">
                <CreditCard className="h-4 w-4 inline-block mr-2 text-blue-400" />
                <strong className="text-white">Payment Reminder:</strong> Settle each invoice directly with
                your freelancer using the payment method you both agreed upon. JobHorizons invoices are
                documentation tools only.
              </p>
            </div>

            {invoicesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : invoices && invoices.length > 0 ? (
              <DataTable columns={invoiceColumns} data={invoices} />
            ) : (
              <div className="py-8 text-center text-sm text-slate-400">
                No invoices yet. Once you hire and collaborate with freelancers,
                any generated invoices will appear here.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card border-white/10 bg-white/5">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-8 w-8 text-emerald-400" />
              <CardTitle className="text-xl">Freelancer Payment Guide</CardTitle>
            </div>
            <CardDescription>
              How to get paid for your work on JobHorizons projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-blue-500/30 bg-blue-500/10">
              <Info className="h-5 w-5 text-blue-400" />
              <AlertTitle className="text-white">You Control Your Payments</AlertTitle>
              <AlertDescription className="text-slate-300">
                JobHorizons does not run an escrow or payout service. You and your client
                arrange payments directly using your preferred method.
              </AlertDescription>
            </Alert>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Handshake className="h-5 w-5 text-primary" />
                Step-by-Step Payment Process
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-white">Agree on Payment Terms</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Before starting work, discuss and document: total budget, milestone payments,
                      payment method (PayPal, Wise, bank transfer, etc.), and payment timeline.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-white">Complete Work & Document Progress</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Use JobHorizons messaging and project tracking tools to share updates,
                      deliverables, and milestone completion confirmations.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-white">Create Invoice (Optional)</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Generate a professional invoice within JobHorizons for documentation,
                      or use your own invoicing software (Wave, FreshBooks, etc.).
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm flex-shrink-0">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-white">Send Payment Request</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Send a PayPal invoice, Wise payment request, or share your bank transfer details
                      directly with the client through JobHorizons messaging or email.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm flex-shrink-0">
                    5
                  </div>
                  <div>
                    <p className="font-medium text-white">Confirm Receipt & Share Confirmation</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Once payment is received, acknowledge receipt in your JobHorizons message thread.
                      Keep payment confirmations for your records.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Payment Tools */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Link2 className="h-8 w-8 text-violet-400" />
            <CardTitle className="text-xl">Recommended Payment Tools</CardTitle>
          </div>
          <CardDescription>
            Popular, trusted platforms for handling payments between freelancers and clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* PayPal */}
            <div className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">PayPal</h4>
                  <Badge variant="secondary" className="text-xs">Most Popular</Badge>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Send and receive money globally with buyer/seller protection. Easy invoicing tools.
              </p>
              <p className="text-xs text-slate-500">
                Best for: Quick payments, international transfers, small to medium projects
              </p>
            </div>

            {/* Wise */}
            <div className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Wise</h4>
                  <Badge variant="secondary" className="text-xs">Low Fees</Badge>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Low-cost international transfers with real exchange rates. Multi-currency accounts.
              </p>
              <p className="text-xs text-slate-500">
                Best for: International payments, currency conversion, frequent cross-border work
              </p>
            </div>

            {/* Bank Transfer */}
            <div className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-slate-500/20 flex items-center justify-center">
                  <Handshake className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Bank Transfer</h4>
                  <Badge variant="secondary" className="text-xs">Traditional</Badge>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Direct bank-to-bank transfers via ACH, wire transfer, or similar methods.
              </p>
              <p className="text-xs text-slate-500">
                Best for: Domestic payments, large projects, established client relationships
              </p>
            </div>

            {/* Stripe Invoice */}
            <div className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Stripe Invoicing</h4>
                  <Badge variant="secondary" className="text-xs">Professional</Badge>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Create and send professional invoices with automatic payment collection.
              </p>
              <p className="text-xs text-slate-500">
                Best for: Recurring projects, professional invoicing, automated billing
              </p>
            </div>

            {/* Wave */}
            <div className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Wave</h4>
                  <Badge variant="secondary" className="text-xs">Free Invoicing</Badge>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Free invoicing and accounting software for freelancers and small businesses.
              </p>
              <p className="text-xs text-slate-500">
                Best for: Budget-conscious freelancers, invoicing + bookkeeping, tax tracking
              </p>
            </div>

            {/* FreshBooks */}
            <div className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">FreshBooks</h4>
                  <Badge variant="secondary" className="text-xs">Full Suite</Badge>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Complete invoicing, time tracking, and accounting platform for professionals.
              </p>
              <p className="text-xs text-slate-500">
                Best for: Established freelancers, time tracking, expense management
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="text-sm text-slate-400">
            <Info className="h-4 w-4 inline-block mr-2 text-blue-400" />
            <strong className="text-white">Note:</strong> JobHorizons is not affiliated with these providers
            and does not receive commissions. These are recommendations based on popular choices in the freelance community.
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="h-8 w-8 text-primary" />
            <CardTitle className="text-xl">Frequently Asked Questions</CardTitle>
          </div>
          <CardDescription>
            Common questions about payments on JobHorizons
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Q1 */}
          <div>
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Why doesn&apos;t JobHorizons process payments?
            </h4>
            <p className="text-sm text-slate-400 pl-6">
              By keeping payments separate, we eliminate platform fees (typically 5-20% on other platforms),
              reduce transaction costs, and give you complete control over your financial relationships.
              You keep 100% of what you earn, and you can use any payment method that works for you and
              your collaborator.
            </p>
          </div>

          {/* Q2 */}
          <div>
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              What if a client doesn&apos;t pay me?
            </h4>
            <p className="text-sm text-slate-400 pl-6">
              First, reach out to the client directly through JobHorizons messaging to resolve the issue.
              If unresolved, contact{' '}
              <Link href="/support" className="text-primary underline">
                JobHorizons Support
              </Link>
              . While we cannot force payment or issue refunds, we can: document the issue, mediate
              communication, and take action against the client&apos;s account if fraud is confirmed (including
              account suspension and verification revocation).
            </p>
          </div>

          {/* Q3 */}
          <div>
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Can I request a refund through JobHorizons?
            </h4>
            <p className="text-sm text-slate-400 pl-6">
              No. Since JobHorizons does not process payments, we cannot issue refunds. Payment disputes,
              refunds, and chargebacks must be handled directly with the other party and through your
              payment provider (e.g., PayPal&apos;s dispute resolution, your bank&apos;s chargeback process).
            </p>
          </div>

          {/* Q4 */}
          <div>
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              How do I protect myself from payment issues?
            </h4>
            <p className="text-sm text-slate-400 pl-6">
              Best practices: (1) Always document payment terms in writing before starting work.
              (2) Use milestone-based payments for large projects. (3) Request upfront deposits for
              new clients. (4) Keep all communication and receipts in JobHorizons messaging.
              (5) Use payment methods with buyer/seller protection (PayPal, Stripe).
              (6) Verify client identity through their JobHorizons verified badge.
            </p>
          </div>

          {/* Q5 */}
          <div>
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Do I need to pay taxes on income earned through JobHorizons?
            </h4>
            <p className="text-sm text-slate-400 pl-6">
              Yes. You are responsible for reporting and paying taxes on all income earned, regardless
              of the platform you use. JobHorizons does not issue tax forms (1099, W-2, etc.) since we
              do not process payments. Consult with a tax professional for guidance specific to your situation.
            </p>
          </div>

          {/* Q6 */}
          <div>
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              What are the invoices in my dashboard for?
            </h4>
            <p className="text-sm text-slate-400 pl-6">
              JobHorizons invoices are documentation and record-keeping tools only. They help you track
              project milestones and payment schedules, but they do not collect payments. You must still
              send payment requests through your chosen external payment method.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices Section */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-emerald-400" />
            <CardTitle className="text-xl">Best Practices for Safe Payments</CardTitle>
          </div>
          <CardDescription>
            Protect yourself and ensure smooth payment experiences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Document Everything</h4>
                  <p className="text-sm text-slate-400">
                    Confirm deliverables, timelines, and payment schedules in writing. Use JobHorizons
                    messaging to create a permanent record of all agreements.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Use Secure Payment Methods</h4>
                  <p className="text-sm text-slate-400">
                    Choose trusted services like PayPal, Wise, or Stripe that offer buyer/seller
                    protection and dispute resolution mechanisms.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Request Milestone Payments</h4>
                  <p className="text-sm text-slate-400">
                    Break large projects into smaller milestones with payments at each stage. This
                    reduces risk for both parties and maintains trust.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Share Payment Confirmations</h4>
                  <p className="text-sm text-slate-400">
                    After each payment, share receipts or confirmations in your JobHorizons message
                    thread for transparency and record-keeping.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Watch for Red Flags</h4>
                  <p className="text-sm text-slate-400">
                    Be cautious of: requests for payment outside agreed methods, pressure to start work
                    before payment terms are finalized, or unusually large upfront payments from new clients.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Communicate Proactively</h4>
                  <p className="text-sm text-slate-400">
                    Keep your collaborator updated on project progress and payment status. Clear
                    communication prevents misunderstandings and builds trust.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Footer Disclaimer */}
      <div className="p-6 rounded-lg border border-slate-700/50 bg-slate-800/30">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-400 space-y-2">
            <p className="font-medium text-slate-300">
              JobHorizons Platform Disclaimer
            </p>
            <p>
              JobHorizons is a professional connection and project management platform. We do not hold,
              process, transfer, or manage funds on behalf of clients or freelancers. All payment
              arrangements, transactions, and financial agreements are made directly between you and your
              collaborator using external payment services of your choice.
            </p>
            <p>
              JobHorizons cannot issue refunds, release payments, mediate financial disputes, or provide
              payment protection services. We recommend documenting all agreements and using payment
              methods with buyer/seller protection. For payment issues, contact your collaborator first,
              then reach out to{' '}
              <Link href="/support" className="text-primary underline">
                JobHorizons Support
              </Link>{' '}
              for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
