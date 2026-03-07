import * as Sentry from "@sentry/nextjs";
import { env } from "@/env";

// Only initialize Sentry if DSN is provided
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
  });
}
