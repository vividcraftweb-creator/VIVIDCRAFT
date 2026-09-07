import { router } from './trpc';
import { jobsRouter } from './routers/jobs.supabase';
import { proposalsRouter } from './routers/proposals.supabase';
import { messagesRouter } from './routers/messages.supabase';
import { profilesRouter } from './routers/profiles.supabase';
import { publicProfileRouter } from './routers/publicProfile.supabase';
import { adminRouter } from './routers/admin.supabase';
// import { braintreeRouter } from './routers/braintree.supabase'; // Disabled for now
import { documentsRouter } from './routers/documents.supabase';
import { notificationsRouter } from './routers/notifications.supabase';
import { verificationsRouter } from './routers/verifications.supabase';
import { milestonesRouter } from './routers/milestones.supabase';
import { contractsRouter } from './routers/contracts.supabase';
import { invoicesRouter } from './routers/invoices.supabase';
import { clientRouter } from './routers/client-router.supabase';
import { userRouter } from './routers/user.supabase';
import { apiKeysRouter } from './routers/apiKeys';
import { webhooksRouter } from './routers/webhooks';
import { recommendationsRouter } from './routers/recommendations';
import { teamRouter } from './routers/team';
import { proposalTrackingRouter } from './routers/proposalTracking';
import { projectMilestonesRouter } from './routers/projectMilestones';
import { projectFilesRouter } from './routers/projectFiles';
import { supportTicketsRouter } from './routers/supportTickets';
import { interviewsRouter } from './routers/interviews.supabase';
import { chatConnectionsRouter } from './routers/chatConnections.supabase';
import { artworksRouter } from './routers/artworks.supabase';

export const appRouter = router({
  user: userRouter,
  chatConnections: chatConnectionsRouter,
  artworks: artworksRouter,
  clients: clientRouter,
  apiKeys: apiKeysRouter,
  webhooks: webhooksRouter,
  recommendations: recommendationsRouter,
  team: teamRouter,
  proposalTracking: proposalTrackingRouter,
  projectMilestones: projectMilestonesRouter,
  projectFiles: projectFilesRouter,
  supportTickets: supportTicketsRouter,
  jobs: jobsRouter,
  proposals: proposalsRouter,
  messages: messagesRouter,
  profiles: profilesRouter,
  publicProfile: publicProfileRouter,
  admin: adminRouter,
  // braintree: braintreeRouter, // Temporarily disabled to prevent server crash
  documents: documentsRouter,
  notifications: notificationsRouter,
  verifications: verificationsRouter,
  milestones: milestonesRouter,
  contracts: contractsRouter,
  invoices: invoicesRouter,
  interviews: interviewsRouter,
});

export type AppRouter = typeof appRouter;
