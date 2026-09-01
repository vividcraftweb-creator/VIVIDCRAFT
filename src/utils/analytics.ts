// Google Analytics 4 (GA4) integration
// https://developers.google.com/analytics/devguides/collection/gtagjs

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Track page views
export const pageview = (url: string) => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || !window.gtag) {
    return;
  }
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
  });
};

// Track custom events
export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || !window.gtag) {
    return;
  }
  window.gtag('event', eventName, properties);
};

// Track specific business events
export const analytics = {
  // User events
  signUp: (method: string) => trackEvent('sign_up', { method }),
  login: (method: string) => trackEvent('login', { method }),

  // Job events
  jobPosted: (jobId: string, category?: string) => trackEvent('job_posted', { job_id: jobId, category }),
  jobViewed: (jobId: string) => trackEvent('job_viewed', { job_id: jobId }),

  // Proposal events
  proposalSubmitted: (jobId: string, proposalId: string) =>
    trackEvent('proposal_submitted', { job_id: jobId, proposal_id: proposalId }),
  proposalAccepted: (proposalId: string) => trackEvent('proposal_accepted', { proposal_id: proposalId }),

  // Payment events
  subscriptionPurchased: (plan: string, amount: number) =>
    trackEvent('purchase', {
      transaction_id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      value: amount,
      currency: 'USD',
      items: [{ item_name: plan }]
    }),

  // Engagement events
  searchPerformed: (query: string, resultsCount: number) =>
    trackEvent('search', { search_term: query, results_count: resultsCount }),
  profileViewed: (profileId: string) => trackEvent('profile_viewed', { profile_id: profileId }),
};
