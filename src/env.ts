import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  server: {
    DATABASE_URL: z.string().url(),
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1),
    SOCKET_PORT: z.coerce.number().default(3001),
    // Braintree Payment Configuration
    BRAINTREE_MERCHANT_ID: z.string().min(1).optional(),
    BRAINTREE_PUBLIC_KEY: z.string().min(1).optional(),
    BRAINTREE_PRIVATE_KEY: z.string().min(1).optional(),
    BRAINTREE_ENVIRONMENT: z.enum(['sandbox', 'production']).optional().default('sandbox'),
    SENTRY_DSN: z.string().url().optional().or(z.literal("")),
    CRON_SECRET: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_SECRET: z.string().min(32).optional(),
  },
  client: {
    // Braintree public tokenization key (optional - can be generated server-side)
    NEXT_PUBLIC_BRAINTREE_TOKENIZATION_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    // Google Analytics 4 Measurement ID (format: G-XXXXXXXXXX)
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().regex(/^G-[A-Z0-9]+$/).optional(),
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    SOCKET_PORT: process.env.SOCKET_PORT,
    // Braintree
    BRAINTREE_MERCHANT_ID: process.env.BRAINTREE_MERCHANT_ID,
    BRAINTREE_PUBLIC_KEY: process.env.BRAINTREE_PUBLIC_KEY,
    BRAINTREE_PRIVATE_KEY: process.env.BRAINTREE_PRIVATE_KEY,
    BRAINTREE_ENVIRONMENT: process.env.BRAINTREE_ENVIRONMENT,
    NEXT_PUBLIC_BRAINTREE_TOKENIZATION_KEY: process.env.NEXT_PUBLIC_BRAINTREE_TOKENIZATION_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    CRON_SECRET: process.env.CRON_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_SECRET: process.env.ADMIN_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
});
