'use client';

import { useState, useEffect, type ComponentType } from 'react';
import { useAuth as useSession } from '@/hooks/useAuth';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Star,
  Crown,
  Check,
  X,
  Loader2,
  ArrowRight,
  TrendingUp,
  Shield,
  MessageSquare,
  BarChart3,
  Users,
  Briefcase,
  FileText,
  Headphones,
  Search,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionPlan } from '@/types/database.types';
import { analytics } from '@/utils/analytics';
import { getSubscriptionPlanInfo } from '@/lib/subscription-plans';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import UnifiedPaymentForm from '@/components/billing/UnifiedPaymentForm';
import { PaymentProcessingModal } from '@/components/billing/PaymentProcessingModal';
import ComingSoonOverlay from '@/components/dashboard/ComingSoonOverlay';

// Feature flag to control subscription functionality
// Set to false to show "Coming Soon" overlay and disable all payment features
const SUBSCRIPTION_FEATURE_ENABLED = false;

type BraintreeRouterOutputs = inferRouterOutputs<AppRouter>['braintree'];
type SubscriptionPlansResponse = BraintreeRouterOutputs['getSubscriptionPlans'];
type SubscriptionPlanConfig = SubscriptionPlansResponse[number];

interface PlanFeature {
  name: string;
  included: boolean;
  icon?: ComponentType<{ className?: string }>;
}

const planFeatures: Record<SubscriptionPlan, PlanFeature[]> = {
  [SubscriptionPlan.FREELANCER_FREE]: [
    { name: '150 application tokens per week', icon: Zap, included: true },
    { name: 'Portfolio showcase (max 5 items)', icon: Briefcase, included: true },
    { name: 'Standard messaging', icon: MessageSquare, included: true },
    { name: 'Basic dashboard access', icon: BarChart3, included: true },
    { name: 'Email support', icon: Shield, included: true },
    { name: 'Elite search placement', icon: Star, included: false },
    { name: 'Advanced analytics', icon: TrendingUp, included: false },
    { name: 'Plan-specific profile badges', icon: Crown, included: false },
  ],
  [SubscriptionPlan.FREELANCER_PRO]: [
    { name: '250 application tokens per week', icon: Zap, included: true },
    { name: 'Portfolio showcase (max 20 items)', icon: Briefcase, included: true },
    { name: 'Priority messaging (higher in inbox)', icon: MessageSquare, included: true },
    { name: 'Pro user badge on your public profile', icon: Crown, included: true },
    { name: 'Advanced dashboard with insights', icon: BarChart3, included: true },
    { name: 'Priority email support', icon: Shield, included: true },
    { name: 'Market demand trends', icon: TrendingUp, included: false },
  ],
  [SubscriptionPlan.FREELANCER_ELITE]: [
    { name: '500 application tokens per week', icon: Zap, included: true },
    { name: 'Unlimited portfolio items', icon: Briefcase, included: true },
    { name: 'VIP messaging privileges', icon: MessageSquare, included: true },
    { name: 'Elite user badge on your public profile', icon: Crown, included: true },
    { name: 'Top-tier search placement', icon: Star, included: true },
    { name: 'Advanced analytics + insights', icon: BarChart3, included: true },
    { name: 'Market demand trends', icon: TrendingUp, included: true },
    { name: 'Priority email support', icon: Shield, included: true },
  ],
  [SubscriptionPlan.CLIENT_STARTER]: [
    { name: 'Post up to 1 job per month', icon: Briefcase, included: true },
    { name: 'Access to verified freelancers', icon: Shield, included: true },
    { name: 'Standard messaging', icon: MessageSquare, included: true },
    { name: 'Email support', icon: Headphones, included: true },
    { name: 'Priority job placement', icon: Star, included: false },
    { name: 'Advanced search filters', icon: Search, included: false },
    { name: 'Team collaboration', icon: Users, included: false },
    { name: 'Project management workspace', icon: FileText, included: false },
  ],
  [SubscriptionPlan.CLIENT_BUSINESS]: [
    { name: 'Unlimited job postings', icon: Briefcase, included: true },
    { name: 'Priority job placement', icon: Star, included: true },
    { name: 'API Access (100 req/hr)', icon: Zap, included: true },
    { name: 'Webhook integrations', icon: Sparkles, included: true },
    { name: 'AI freelancer recommendations (top 5)', icon: TrendingUp, included: true },
    { name: 'Team collaboration (up to 2 members)', icon: Users, included: true },
    { name: 'Enhanced analytics dashboard', icon: BarChart3, included: true },
    { name: 'Project management tools (milestones, files)', icon: FileText, included: true },
    { name: 'Priority email support', icon: Headphones, included: true },
    { name: 'Advanced API (1000 req/hr)', icon: Zap, included: false },
    { name: 'Unlimited team members', icon: Users, included: false },
    { name: 'AI recommendations (top 10)', icon: TrendingUp, included: false },
  ],
  [SubscriptionPlan.CLIENT_ENTERPRISE]: [
    { name: 'Everything in Business', icon: Crown, included: true },
    { name: 'Advanced API (1000 req/hr)', icon: Zap, included: true },
    { name: 'Advanced webhooks with retry logic', icon: Sparkles, included: true },
    { name: 'AI recommendations (top 10 matches)', icon: TrendingUp, included: true },
    { name: 'Unlimited team members', icon: Users, included: true },
    { name: 'Advanced analytics with custom reports', icon: BarChart3, included: true },
    { name: 'Priority email support', icon: Headphones, included: true },
    { name: 'Audit logs & activity tracking', icon: Shield, included: true },
    { name: 'Early access to new features', icon: Star, included: true },
  ],
};

export default function SubscriptionView() {
  const { data: session, status } = useSession();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanConfig | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const utils = trpc.useUtils();

  const { data: currentSubscription, refetch: refetchSubscription } = trpc.braintree.getCurrentSubscription.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 60000, // Cache for 1 minute
  });
  const { data: subscriptionPlans } = trpc.braintree.getSubscriptionPlans.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 300000, // Cache for 5 minutes (plans rarely change)
  });

  const verifySubscription = trpc.braintree.verifySubscription.useMutation({
    onSuccess: async (result) => {
      if (result.success) {
        toast.success(`Successfully subscribed to ${selectedPlan?.name}!`);

        // Track subscription purchase event
        if (selectedPlan) {
          analytics.subscriptionPurchased(selectedPlan.plan, selectedPlan.priceAmount);
        }

        setShowCheckoutModal(false);
        setSelectedPlan(null);
        // Wait for both invalidations to complete to ensure fresh data
        await Promise.all([
          utils.braintree.getCurrentSubscription.invalidate(),
          utils.braintree.getSubscriptionStatus.invalidate(),
          utils.profiles.getMyProfile.invalidate(),
          utils.user.getPlanFeatures.invalidate(),
          utils.user.getCurrentUser.invalidate(),
        ]);
        // Force refetch to ensure UI updates
        await refetchSubscription();
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to verify subscription');
    },
  });

  const cancelSubscription = trpc.braintree.cancelSubscription.useMutation({
    onSuccess: async (result) => {
      if (result.success) {
        toast.success(result.message);
        await utils.braintree.getCurrentSubscription.invalidate();
        await refetchSubscription();
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel subscription');
    },
  });

  const downgradeToFree = trpc.braintree.downgradeToFree.useMutation({
    onSuccess: async (result) => {
      if (result.success) {
        toast.success(result.message);
        await Promise.all([
          utils.braintree.getCurrentSubscription.invalidate(),
          utils.braintree.getSubscriptionStatus.invalidate(),
          utils.profiles.getMyProfile.invalidate(),
          utils.user.getPlanFeatures.invalidate(),
          utils.user.getCurrentUser.invalidate(),
        ]);
        await refetchSubscription();
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to downgrade to free plan');
    },
  });

  const handleCancelSubscription = () => {
    // Guard: Prevent any subscription actions when feature is disabled
    if (!SUBSCRIPTION_FEATURE_ENABLED) {
      toast.info('Subscription management is coming soon!');
      return;
    }
    if (confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period.')) {
      cancelSubscription.mutate();
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlanConfig) => {
    // Guard: Prevent any subscription actions when feature is disabled
    if (!SUBSCRIPTION_FEATURE_ENABLED) {
      toast.info('Subscription management is coming soon!');
      return;
    }

    if (!session) {
      toast.error('Please sign in to upgrade');
      return;
    }

    const canonical = getSubscriptionPlanInfo(plan.plan as SubscriptionPlan);
    const normalizedPlan: SubscriptionPlanConfig = {
      ...plan,
      priceAmount: canonical.priceAmount,
      name: canonical.name,
      description: canonical.description,
    };

    // Check if user has an active paid subscription that hasn't been cancelled
    const hasActivePaidPlan = currentPlan &&
      currentPlan !== 'FREELANCER_FREE' &&
      currentPlan !== 'CLIENT_STARTER' &&
      currentSubscription?.activeSubscription &&
      !currentSubscription.activeSubscription.cancelAtPeriodEnd;

    // Prevent downgrade to free plan ONLY if user has an active (non-cancelled) paid subscription
    if (canonical.priceAmount === 0 && hasActivePaidPlan) {
      toast.error('You are currently subscribed to a paid plan. Please cancel your current subscription before switching to a Free Plan.');
      return;
    }

    // For free plan, if already cancelled or no active subscription, downgrade immediately
    if (canonical.priceAmount === 0) {
      if (confirm('Are you sure you want to downgrade to the Free Plan? This will happen immediately.')) {
        downgradeToFree.mutate();
      }
      return;
    }

    setSelectedPlan(normalizedPlan);
    setShowCheckoutModal(true);
  };

  const handleCheckoutSuccess = async (
    paymentMethodNonce: string,
    billingAddress: {
      firstName: string;
      lastName: string;
      streetAddress: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    }
  ) => {
    if (!paymentMethodNonce) {
      toast.error('No payment method received');
      return;
    }

    setIsPaymentProcessing(true);
    try {
      await verifySubscription.mutateAsync({
        paymentMethodNonce,
        subscriptionPlan: selectedPlan!.plan,
        billingAddress,
      });
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handleCheckoutError = (error: unknown): void => {
    toast.error('Payment failed. Please try again.');
    setShowCheckoutModal(false);
    setSelectedPlan(null);
    setIsPaymentProcessing(false); // Reset processing state
  };

  const handleCheckoutCancel = () => {
    toast.info('Payment cancelled');
    setShowCheckoutModal(false);
    setSelectedPlan(null);
    setIsPaymentProcessing(false); // Reset processing state
  };

  // Wait for session to load before filtering plans to prevent showing wrong plans initially
  const userRole = session?.session?.user?.role;
  const isSessionLoading = status === 'loading';

  const filteredPlans = (subscriptionPlans?.filter(plan =>
    userRole === 'FREELANCER'
      ? plan.plan.startsWith('FREELANCER')
      : plan.plan.startsWith('CLIENT')
  ) || []);

  const orderedPlans = filteredPlans
    .slice()
    .sort((a, b) => {
      const order =
        userRole === 'FREELANCER'
          ? [
              SubscriptionPlan.FREELANCER_PRO,
              SubscriptionPlan.FREELANCER_ELITE,
            ]
          : [
              SubscriptionPlan.CLIENT_BUSINESS,
              SubscriptionPlan.CLIENT_ENTERPRISE,
            ];
      return order.indexOf(a.plan as SubscriptionPlan) - order.indexOf(b.plan as SubscriptionPlan);
    });

  const visiblePlans = orderedPlans
    .filter((plan) => {
      const canonical = getSubscriptionPlanInfo(plan.plan as SubscriptionPlan);
      return canonical.priceAmount > 0;
    })
    .map((plan) => {
      const canonical = getSubscriptionPlanInfo(plan.plan as SubscriptionPlan);
      return {
        ...plan,
        priceAmount: canonical.priceAmount,
        name: canonical.name,
        description: canonical.description,
      };
    });

  const currentPlan = currentSubscription?.currentPlan;

  const PlanCard = ({ plan, isPopular = false }: { plan: SubscriptionPlanConfig, isPopular?: boolean }) => {
    const planKey = plan.plan as SubscriptionPlan;
    const canonical = getSubscriptionPlanInfo(planKey);
    const isCurrentPlan = currentPlan === plan.plan;
    const isLoading = selectedPlan?.plan === plan.plan && showCheckoutModal;
    const features = planFeatures[planKey] ?? [];
    const isCancelled = currentSubscription?.activeSubscription?.cancelAtPeriodEnd || false;
    const hasPaidPlan =
      currentPlan !== SubscriptionPlan.FREELANCER_FREE &&
      currentPlan !== SubscriptionPlan.CLIENT_STARTER;

    return (
      <div className={`relative p-6 rounded-2xl border transition-all duration-300 hover-lift ${
        isCurrentPlan
          ? 'border-primary bg-primary/10 glass-card'
          : isPopular
            ? 'border-chart-4 bg-chart-4/10 glass-card'
            : 'border-glass-border glass-card'
      }`}>

        {isPopular && !isCurrentPlan && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-chart-4 text-white px-3 py-1 font-semibold">
              <Star className="h-3 w-3 mr-1" />
              Most Popular
            </Badge>
          </div>
        )}

        {isCurrentPlan && (
          <div className="absolute -top-3 right-4">
            <Badge className="bg-primary text-white px-3 py-1 font-semibold">
              <Crown className="h-3 w-3 mr-1" />
              Current Plan
            </Badge>
          </div>
        )}

        <div className="flex items-center justify-center mb-4">
          <div className={`p-3 rounded-xl ${
            plan.plan.includes('FREE') ? 'bg-green-500/20' :
            plan.plan.includes('PRO') || plan.plan.includes('BUSINESS') ? 'bg-chart-4/20' :
            'bg-primary/20'
          }`}>
            {plan.plan.includes('FREE') ? <Zap className="h-6 w-6 text-green-400" /> :
             plan.plan.includes('PRO') || plan.plan.includes('BUSINESS') ? <Star className="h-6 w-6 text-chart-4" /> :
             <Crown className="h-6 w-6 text-primary" />}
          </div>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-white mb-2">{canonical.name}</h3>
          <p className="text-muted-foreground text-sm mb-4">{canonical.description}</p>

          <div className="mb-4">
            <span className="text-4xl font-bold text-white">
              {canonical.priceAmount === 0 ? 'Free' : `$${canonical.priceAmount}`}
            </span>
            {canonical.priceAmount > 0 && (
              <span className="text-muted-foreground">/month</span>
            )}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {features.map((feature: PlanFeature, index: number) => {
            const IconComponent = feature.icon;
            return (
            <div key={index} className="flex items-start space-x-2">
              <div className={`p-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                feature.included ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {feature.included ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <X className="h-3 w-3 text-red-400" />
                )}
              </div>
              {IconComponent ? (
                <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              ) : (
                <span className="h-4 w-4 flex-shrink-0" />
              )}
              <span className={`text-sm ${
                feature.included ? 'text-foreground' : 'text-muted-foreground/50'
              }`}>
                {feature.name}
              </span>
            </div>
          );})}
        </div>

        <Button
          onClick={() => handleUpgrade({ ...plan, priceAmount: canonical.priceAmount })}
          disabled={!SUBSCRIPTION_FEATURE_ENABLED || (isCurrentPlan && !isCancelled) || isLoading}
          className={`w-full h-12 font-semibold rounded-xl transition-all ${
            (isCurrentPlan && !isCancelled)
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : isPopular
                ? 'bg-chart-4 hover:scale-105'
                : canonical.priceAmount === 0
                  ? 'bg-green-600 hover:scale-105'
                  : 'glass-button bg-primary hover:scale-105'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : isCurrentPlan && !isCancelled ? (
            'Current Plan'
          ) : isCurrentPlan && isCancelled ? (
            'Renew Plan'
          ) : canonical.priceAmount === 0 ? (
            <>
              Switch to Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : hasPaidPlan && isCancelled ? (
            <>
              Switch to {plan.name}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : hasPaidPlan ? (
            <>
              Switch Plan
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              Upgrade Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    );
  };

  // Check if user has a paid plan that can be cancelled
  const canCancelSubscription = currentPlan &&
    currentPlan !== 'FREELANCER_FREE' &&
    currentPlan !== 'CLIENT_STARTER' &&
    currentSubscription?.activeSubscription &&
    !currentSubscription.activeSubscription.cancelAtPeriodEnd;

  // Show loading state while session is loading to prevent flash of wrong plans
  if (isSessionLoading || !userRole) {
    return (
      <div className="relative min-h-[600px]">
        {/* Coming Soon Overlay - always shown when feature is disabled */}
        {!SUBSCRIPTION_FEATURE_ENABLED && <ComingSoonOverlay />}

        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Subscription Plans</h2>
            <p className="text-muted-foreground">Choose the plan that fits your needs</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 rounded-2xl border border-glass-border animate-pulse">
                <div className="h-16 bg-white/10 rounded-xl mb-4" />
                <div className="h-8 bg-white/10 rounded mb-2" />
                <div className="h-4 bg-white/10 rounded mb-4" />
                <div className="h-12 bg-white/10 rounded mb-6" />
                <div className="space-y-3 mb-6">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-4 bg-white/10 rounded" />
                  ))}
                </div>
                <div className="h-12 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[600px]">
      {/* Coming Soon Overlay - always shown when feature is disabled */}
      {!SUBSCRIPTION_FEATURE_ENABLED && <ComingSoonOverlay />}

      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Subscription Plans</h2>
          <p className="text-muted-foreground">Choose the plan that fits your needs</p>
        </div>

      {/* Current Subscription Status Card */}
      {currentSubscription?.planConfig && currentPlan !== 'FREELANCER_FREE' && currentPlan !== 'CLIENT_STARTER' && (
        <div className="glass-card p-6 rounded-2xl border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-bold text-white">Current Subscription</h3>
              </div>
              <p className="text-muted-foreground">
                You&apos;re subscribed to <span className="font-semibold text-white">{currentSubscription.planConfig.name}</span>
              </p>
              {currentSubscription.activeSubscription && (
                <div className="text-sm text-muted-foreground">
                  {currentSubscription.activeSubscription.cancelAtPeriodEnd ? (
                    <p className="text-orange-400">
                      ⚠️ Cancels on {new Date(currentSubscription.activeSubscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  ) : (
                    <p>
                      Renews on {new Date(currentSubscription.activeSubscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
            {canCancelSubscription && (
              <Button
                onClick={handleCancelSubscription}
                disabled={!SUBSCRIPTION_FEATURE_ENABLED || cancelSubscription.isPending}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                {cancelSubscription.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel Subscription
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visiblePlans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isPopular={index === 1}
          />
        ))}
      </div>

      {/* PayPal Checkout Modal */}
      <Dialog
        open={showCheckoutModal}
        onOpenChange={(open) => {
          // Prevent closing dialog during active payment processing
          if (!open && (isPaymentProcessing || verifySubscription.isPending)) {
            toast.warning('Please wait while we process your payment...');
            return;
          }
          setShowCheckoutModal(open);
          if (!open) {
            // Reset states when closing
            setSelectedPlan(null);
            setIsPaymentProcessing(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Complete Your Subscription
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Subscribe to {selectedPlan?.name} for ${selectedPlan?.priceAmount}/month
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="mt-4 pb-4">
              <UnifiedPaymentForm
                amount={selectedPlan.priceAmount.toString()}
                planName={selectedPlan.name}
                subscriptionPlan={selectedPlan.plan}
                onSuccess={handleCheckoutSuccess}
                onError={handleCheckoutError}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Processing Loading Modal - Separate, stacks above checkout */}
      <PaymentProcessingModal
        isOpen={verifySubscription.isPending || isPaymentProcessing}
      />
      </div>
    </div>
  );
}
