import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionPlan } from '@/types/database.types';

// Premium routes that require specific subscription plans
const PREMIUM_ROUTES = [
  {
    path: '/settings/team',
    plans: [SubscriptionPlan.CLIENT_BUSINESS, SubscriptionPlan.CLIENT_ENTERPRISE],
  },
  {
    path: '/settings/api-keys',
    plans: [SubscriptionPlan.CLIENT_BUSINESS, SubscriptionPlan.CLIENT_ENTERPRISE],
  },
  {
    path: '/settings/webhooks',
    plans: [SubscriptionPlan.CLIENT_BUSINESS, SubscriptionPlan.CLIENT_ENTERPRISE],
  },
];

export async function middleware(request: NextRequest) {
  // First, update the session
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Check if this is a premium route
  const premiumRoute = PREMIUM_ROUTES.find((route) => pathname.startsWith(route.path));

  if (premiumRoute) {
    try {
      const supabase = await createClient();

      // Get the current user from the session
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        // Not authenticated, redirect to sign in
        return NextResponse.redirect(new URL('/auth/signin', request.url));
      }

      // Check user's subscription plan
      const { data: user } = await supabase
        .from('User')
        .select('subscriptionPlan')
        .eq('id', authUser.id)
        .single();

      if (!user) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      const userPlan = user.subscriptionPlan as SubscriptionPlan;
      const hasAccess = premiumRoute.plans.includes(userPlan);

      if (!hasAccess) {
        // User doesn't have the required plan, redirect to subscription page
        const upgradeUrl = new URL('/dashboard', request.url);
        upgradeUrl.searchParams.set('tab', 'subscription');
        upgradeUrl.searchParams.set('upgrade', 'required');
        return NextResponse.redirect(upgradeUrl);
      }
    } catch (error) {
      // On error, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
