# 🌐 JobHorizons - Freelance Marketplace Platform

![Next.js](https://img.shields.io/badge/Next.js-15.5.7-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.1.2-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![tRPC](https://img.shields.io/badge/tRPC-11.4.4-2596BE?logo=trpc&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Cron Jobs](#cron-jobs)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Analytics & Monitoring](#analytics--monitoring)
- [Security](#security)
- [Contributing](#contributing)

---

## 🎯 Overview

**JobHorizons** is a modern, full-stack freelance marketplace platform that connects talented freelancers with clients worldwide. Built with Next.js 15 and deployed on Vercel, the platform offers comprehensive job posting, proposal management, contract handling, milestone tracking, and team collaboration features.

The platform serves three user types:
- **Freelancers**: Find work, submit proposals, manage contracts
- **Clients**: Post jobs, hire talent, manage projects
- **Admins**: Moderate content, manage users, monitor platform health

### Key Highlights
- 🚀 **Modern Stack**: Next.js 15 App Router, React 19, TypeScript
- 💳 **Integrated Payments**: Braintree (PayPal) subscription management
- 🤖 **AI-Powered**: Anthropic Claude for proposal analysis and freelancer matching
- 🔒 **Enterprise Security**: API keys, webhooks, rate limiting, fraud detection
- 📊 **Analytics**: Vercel Analytics + Speed Insights for performance monitoring
- ⚡ **Real-time**: tRPC for type-safe API calls with React Query
- 🎨 **Beautiful UI**: Tailwind CSS 4 + Radix UI + shadcn components

---

## ✨ Features

### 👤 For Freelancers

#### Profile & Portfolio
- **Comprehensive Profile Editor** with completeness tracking
- **Portfolio Showcase**: Up to 5 items (Free), 20 (Pro), Unlimited (Elite)
- **Skills Taxonomy**: Structured skill selection
- **Experience & Education**: Full work history tracking
- **Certifications**: Professional credentials display
- **Verification Badge**: Identity verification with document upload
- **Custom Profile URL**: Personalized slug for your profile

#### Job Search & Applications
- **Advanced Job Search**: Filter by skills, budget, location, experience
- **AI-Powered Recommendations**: Jobs matched to your profile
- **Token System**: Weekly application credits (150-500 based on plan)
- **Proposal Builder**: Rich cover letters with screening question responses
- **Application Tracking**: Monitor proposal status in real-time

#### Work Management
- **Contract Dashboard**: Track active projects
- **Milestone Tracking**: Submit work and receive payments
- **Messaging**: Direct communication with clients
- **Notifications**: Real-time updates on proposals, contracts, payments

#### Subscription Tiers
| Plan | Price | Tokens/Week | Portfolio | Features |
|------|-------|-------------|-----------|----------|
| **Free** | $0 | 150 | 5 items | Standard messaging, basic dashboard |
| **Pro** | $9.99/mo | 250 | 20 items | Priority messaging, advanced analytics |
| **Elite** | $12.99/mo | 500 | Unlimited | VIP messaging, top search placement, market insights |

---

### 💼 For Clients

#### Job Management
- **11-Step Job Creation Wizard** with auto-save
- **Rich Job Descriptions**: Detailed requirements, deliverables, screening questions
- **Media Uploads**: Attach project files, images, documents
- **Budget Flexibility**: Fixed-price or hourly rate options
- **Job Status Control**: Draft, publish, pause, close
- **Deadline Management**: Set and track project timelines

#### Hiring & Proposals
- **Proposal Dashboard**: Review all applications in one place
- **AI Screening Scores**: Automatic proposal quality analysis
- **Freelancer Recommendations**: Top 5-10 AI-matched candidates
- **Screening Questions**: Custom questions to vet candidates
- **Compare Candidates**: Side-by-side proposal comparison
- **Direct Messaging**: Chat with applicants before hiring

#### Project Management
- **Contract Creation**: Generate contracts from accepted proposals
- **Milestone System**: Break projects into funded milestones
- **Payment Protection**: Escrow-like payment security
- **Progress Tracking**: Monitor milestone completion (0-100%)
- **Work Approval**: Review and approve deliverables
- **Team Collaboration** (Business+): Invite team members with role-based access

#### Enterprise Features (Business/Enterprise Plans)
- **API Access**: RESTful API with scoped keys (100-1000 req/hr)
- **Webhooks**: Event-driven integrations with HMAC signatures
- **Advanced Analytics**: Custom reports, trends, conversion metrics
- **Team Management**: 2 members (Business), Unlimited (Enterprise)
- **Priority Support**: Faster response times
- **Audit Logs**: Complete activity trail

#### Subscription Tiers
| Plan | Price | Jobs/Month | Team Members | Features |
|------|-------|------------|--------------|----------|
| **Starter** | $0 | 1 | 1 | Verified freelancers, standard messaging |
| **Business** | $12.99/mo | Unlimited | 2 | API access (100 req/hr), webhooks, AI recommendations (top 5) |
| **Enterprise** | $18.99/mo | Unlimited | Unlimited | Advanced API (1000 req/hr), custom reports, AI recommendations (top 10), early features |

---

### 🛡️ For Administrators

#### User Management
- **User Search & Filter**: Email, role, plan, verification status
- **Account Actions**: Suspend, unsuspend, ban users
- **Subscription Control**: Manually adjust user plans
- **Fraud Flags**: View and review flagged accounts

#### Content Moderation
- **Job Approval Queue**: Review and approve job postings
- **Verification Queue**: Process ID verification submissions
- **Proposal Monitoring**: Track platform-wide proposal activity

#### Security & Fraud
- **Fraud Detection Dashboard**: Review flagged accounts
- **Trust Scores**: 0-100 risk assessment per user
- **Disposable Email Detection**: Block temporary email addresses
- **Duplicate Content Detection**: Identify copied portfolios
- **Auto-Suspension**: High-risk accounts automatically suspended

#### Analytics & Insights
- **System Statistics**: Users, jobs, proposals, contracts
- **Growth Metrics**: Monthly registration and activity trends
- **Revenue Tracking**: Subscription and transaction monitoring
- **Activity Feed**: Real-time platform events

#### Support & Operations
- **Support Ticket Queue**: Manage user inquiries
- **Audit Logs**: Complete system activity trail
- **Message Monitoring**: Review conversations for abuse
- **Configuration**: Feature toggles, rate limits, thresholds

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 15.5.7](https://nextjs.org/) (App Router)
- **UI Library**: [React 19.1.2](https://react.dev/)
- **Language**: [TypeScript 5.x](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/) + [HeroUI](https://heroui.com/)
- **Icons**: [Lucide React](https://lucide.dev/) + [Tabler Icons](https://tabler.io/icons)
- **Forms**: React Hook Form + [Zod 4](https://zod.dev/) validation
- **Animations**: [Framer Motion](https://www.framer.com/motion/) + [GSAP](https://gsap.com/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)
- **Maps**: [React Google Maps API](https://react-google-maps-api-docs.netlify.app/)
- **Charts**: [Recharts](https://recharts.org/)
- **3D Graphics**: [Cobe](https://github.com/shuding/cobe) + [OGL](https://oframe.github.io/ogl/)
- **Date Handling**: [date-fns](https://date-fns.org/)

### Backend & API
- **API Layer**: [tRPC 11.4.4](https://trpc.io/) with [React Query 5](https://tanstack.com/query)
- **Serialization**: [SuperJSON](https://github.com/blitz-js/superjson)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL 15+ with RLS)
- **Authentication**: [Supabase Auth](https://supabase.com/auth) (email/password with verification)
- **Storage**: Supabase Storage buckets (documents, images, job media)
- **Edge Functions**: Supabase Edge Functions (Deno runtime)

### Payments & Monetization
- **Payment Gateway**: [Braintree](https://www.braintreepayments.com/) (PayPal)
- **Subscription Management**: Braintree Subscriptions
- **Webhook Processing**: Exponential backoff retry logic

### AI & Automation
- **AI Provider**: [Anthropic Claude](https://www.anthropic.com/) (claude-sonnet-4-5)
- **Use Cases**: Proposal analysis, freelancer matching, screening
- **Fraud Detection**: Custom heuristic algorithms
- **Email**: [Brevo](https://www.brevo.com/) (formerly Sendinblue)

### Infrastructure & DevOps
- **Hosting**: [Vercel](https://vercel.com/)
- **Deployment**: Automatic via GitHub integration
- **Cron Jobs**: Vercel Cron + cron-job.org
- **Analytics**: Vercel Analytics + Speed Insights
- **Error Tracking**: [Sentry](https://sentry.io/)
- **Version Control**: Git + GitHub

### Development Tools
- **Linting**: ESLint (flat config)
- **Testing**: Playwright (installed)
- **Dev Server**: Nodemon + Custom Node server
- **Package Manager**: npm

---

## 🏗️ Architecture

### System Overview

```mermaid
flowchart TD
    User[Users] -->|HTTPS| Vercel[Vercel Edge Network]
    Vercel --> NextApp[Next.js App Router]
    NextApp -->|tRPC| TRPC[tRPC Routers]
    TRPC -->|Supabase SDK| DB[(Supabase PostgreSQL)]
    TRPC -->|Storage SDK| Storage[(Supabase Storage)]
    NextApp -->|REST| API[API Routes]
    API --> DB
    API --> Braintree[Braintree Gateway]
    API --> Email[Supabase Edge: send-email]
    Email --> Brevo[Brevo Email Service]
    Cron1[Vercel Cron] --> API
    Cron2[cron-job.org] --> API
    Client[External Clients] -->|API Keys| API
    Webhooks[Client Webhooks] <-->|HMAC| API
```

### Request Flow

1. **Client Request** → Vercel Edge Network (CDN + Edge Functions)
2. **Middleware** → Authentication check, role verification
3. **App Router** → Server/Client components render
4. **tRPC Layer** → Type-safe API calls from client components
5. **Business Logic** → Feature gating, quota enforcement, validation
6. **Supabase** → Database queries with Row-Level Security
7. **Response** → JSON data or rendered HTML

### Data Security

- **Row-Level Security (RLS)**: All Supabase tables enforce user isolation
- **API Key Scoping**: Granular permissions per API key
- **Rate Limiting**: IP-based and user-based throttling
- **Encryption**: HTTPS in transit, encrypted at rest in Supabase
- **Input Validation**: Zod schemas on all tRPC procedures
- **Output Sanitization**: Secure ID encoding, no raw IDs exposed

### Performance Optimizations

- **Static Generation**: Landing pages, marketing content
- **Server Components**: Default for data-fetching pages
- **Client Components**: Interactive UI elements only
- **Image Optimization**: Next.js Image component with AVIF/WebP
- **Code Splitting**: Automatic chunking by Next.js
- **Edge Caching**: Static assets cached at edge (31536000s)
- **Database Indexes**: Optimized queries on hot paths
- **React Query Caching**: Client-side data cache with stale-while-revalidate

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 20.x or later
- **npm**: 10.x or later
- **Supabase Account**: [Sign up](https://supabase.com/)
- **Braintree Account**: [Sign up](https://www.braintreepayments.com/)
- **Anthropic API Key**: [Get key](https://console.anthropic.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/NiepresJohn/jobhorizons-freelancing-marketplace.git
   cd jobhorizons
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Configure Supabase**
   - Create a new Supabase project
   - Run database migrations from `supabase/migrations/`
   - Deploy edge functions:
     ```bash
     supabase functions deploy send-email
     ```
   - Set Supabase secrets in dashboard:
     - `BREVO_API_KEY`
     - `ANTHROPIC_API_KEY`

5. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

### First-Time Setup

1. **Create Admin Account**
   - Register via `/auth/signup`
   - Manually update user role in Supabase:
     ```sql
     UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@example.com';
     ```

2. **Configure Subscription Plans**
   - Plans are defined in `lib/subscription-plans.ts`
   - Sync with Braintree plan IDs in dashboard

3. **Test Payment Flow**
   - Use Braintree sandbox credentials
   - Test credit card: `4111 1111 1111 1111`

---

## 🔐 Environment Variables

### Required Variables

```env
# Next.js
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-min-32-chars

# Braintree (PayPal)
BRAINTREE_MERCHANT_ID=your-merchant-id
BRAINTREE_PUBLIC_KEY=your-public-key
BRAINTREE_PRIVATE_KEY=your-private-key
BRAINTREE_ENVIRONMENT=sandbox
NEXT_PUBLIC_BRAINTREE_TOKENIZATION_KEY=sandbox_xxx

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-api03-xxx

# Cron Jobs
CRON_SECRET=your-cron-secret-min-32-chars

# Email (Configured in Supabase Edge Function)
BREVO_API_KEY=xkeysib-xxx
FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Security
ID_SECRET_KEY=your-hmac-secret-for-id-encoding-min-32-chars

# Optional - Development
SENTRY_DSN=https://xxx@sentry.io/xxx
SOCKET_PORT=3001
FRAUD_PREVENTION_V1=true
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Production-Only Variables

```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
BRAINTREE_ENVIRONMENT=production
```

---

## 🚀 Deployment

### Vercel Deployment

1. **Connect GitHub Repository**
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel auto-detects Next.js configuration

2. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.example`
   - Set for Production, Preview, and Development

3. **Deploy**
   - Push to `main` branch triggers automatic deployment
   - Vercel builds and deploys in ~2-3 minutes
   - Deployment URL: your deployment URL

4. **Custom Domain** (Optional)
   - Go to Project Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed
   - SSL certificate auto-provisioned by Vercel

### Build Configuration

Vercel automatically detects:
- **Framework**: Next.js
- **Build Command**: `npm run build` (runs `tsc && next build`)
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node Version**: 20.x (specified in `vercel.json`)

### Environment-Specific Settings

**Production**
- Enable Analytics and Speed Insights
- Set `NODE_ENV=production`
- Use production Braintree credentials

**Preview (Staging)**
- Deployed on every PR
- Use sandbox payment credentials
- Preview URL: `https://project-git-branch.vercel.app`

**Development**
- Local environment only
- Use sandbox/test credentials
- Hot reload enabled

---

## ⏰ Cron Jobs

### Vercel Cron Jobs (2/2 - Hobby Plan Limit)

Configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-tasks",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/refresh-tokens",
      "schedule": "0 0 * * 1"
    }
  ]
}
```

#### 1. Daily Tasks (Consolidated - Daily)
- **Schedule**: Every day at 00:00 UTC
- **Endpoint**: `/api/cron/daily-tasks`
- **Consolidated Operations**:

  **Subscription Management**:
  - Send renewal reminders (3 days before expiry)
  - Set grace period for expired subscriptions
  - Downgrade users past grace period
  - Send email notifications

  **Fraud Monitoring**:
  - Re-scan users with low trust scores (< 70)
  - Re-scan users with recent activity (proposals/messages in last 24 hours)
  - Auto-suspend high-risk accounts
  - Auto-unsuspend users with improved trust scores (> 75 for 30+ days)
  - Notify admins of suspensions

- **Error Handling**: Each operation runs independently with error isolation. If one operation fails, the other continues. Results are logged separately.

#### 2. Refresh Tokens (Weekly)
- **Schedule**: Every Monday at 00:00 UTC
- **Endpoint**: `/api/cron/refresh-tokens`
- **Actions**:
  - Reset all freelancer application tokens
  - Log token refresh events
  - Email summary to admins

### External Cron Job (cron-job.org)

#### 3. Retry Webhooks (Every 5 Minutes)
- **Service**: [cron-job.org](https://cron-job.org)
- **Schedule**: `*/5 * * * *` (every 5 minutes)
- **Endpoint**: `https://yourdomain.com/api/cron/retry-webhooks`
- **Headers**: `Authorization: Bearer $CRON_SECRET`
- **Actions**:
  - Retry failed webhook deliveries
  - Exponential backoff (1m, 5m, 30m, 2h, 12h)
  - Mark permanently failed after 5 attempts

### Monitoring Cron Jobs

**Vercel Dashboard**
- Go to Project → Cron
- View execution history
- Manually trigger jobs for testing
- Monitor success/failure rates

**cron-job.org Dashboard**
- View execution logs
- Response status codes
- Failure notifications via email

---

## 📡 API Documentation

### REST API (v1)

Base URL: `https://yourdomain.com/api/v1`

#### Authentication

All API requests require an API key in the Authorization header:

```bash
curl https://yourdomain.com/api/v1/jobs \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Endpoints

##### Jobs

**List Jobs**
```http
GET /api/v1/jobs?page=1&limit=20&category=Development
```

**Get Job**
```http
GET /api/v1/jobs/{jobId}
```

**Create Job**
```http
POST /api/v1/jobs
Content-Type: application/json

{
  "title": "Senior React Developer",
  "description": "We need an experienced React developer...",
  "category": "Development & IT",
  "budgetType": "FIXED",
  "budgetAmount": 5000,
  "experienceLevel": "EXPERT",
  "skills": ["React", "TypeScript", "Next.js"]
}
```

##### Analytics

**Get Analytics**
```http
GET /api/v1/analytics?startDate=2025-01-01&endDate=2025-01-31
```

**Get Summary**
```http
GET /api/v1/analytics/summary
```

#### Rate Limits

| Plan | Limit | Reset Window |
|------|-------|--------------|
| Business | 100 requests/hour | Rolling |
| Enterprise | 1000 requests/hour | Rolling |

#### Error Responses

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key",
  "statusCode": 401
}
```

### tRPC API

**Client-side usage:**

```typescript
import { api } from '@/lib/trpc/client';

// Get jobs
const { data: jobs } = api.jobs.getJobs.useQuery({
  category: 'Development & IT',
  page: 1,
  limit: 20
});

// Create proposal
const createProposal = api.proposals.createProposal.useMutation();
await createProposal.mutateAsync({
  jobId: 'job-123',
  coverLetter: 'I would love to work on this project...',
  proposedRate: 50
});
```

**Available Routers:**
- `user` - User profile and settings
- `jobs` - Job CRUD operations
- `proposals` - Proposal management
- `proposalTracking` - Proposal tracking and CRM
- `messages` - Messaging system
- `profiles` - Freelancer profiles
- `publicProfile` - Public profile views
- `contracts` - Contract management
- `milestones` - Milestone tracking
- `projectMilestones` - Project milestone management
- `projectFiles` - Project file management
- `notifications` - Notification center
- `documents` - Document verification
- `interviews` - Video interview scheduling
- `invoices` - Invoice management
- `braintree` - Payment and subscription management
- `apiKeys` - API key management (Business+)
- `webhooks` - Webhook configuration (Business+)
- `team` - Team collaboration (Business+)
- `recommendations` - AI-powered recommendations
- `supportTickets` - Support ticket system
- `admin` - Admin panel operations (Admin only)
- `client` - Client-specific operations

### Webhooks

**Event Types:**
- `proposal.submitted`
- `proposal.accepted`
- `proposal.rejected`
- `contract.created`
- `contract.signed`
- `milestone.created`
- `milestone.funded`
- `milestone.completed`
- `payment.succeeded`
- `payment.failed`

**Webhook Payload:**

```json
{
  "id": "evt_123",
  "type": "proposal.submitted",
  "createdAt": "2025-11-17T10:00:00Z",
  "data": {
    "proposalId": "prop_456",
    "jobId": "job_789",
    "freelancerId": "user_012",
    "amount": 5000
  }
}
```

**Signature Verification:**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## 🗄️ Database Schema

### Core Tables

#### User
- `id` (UUID, PK)
- `email` (unique)
- `role` (FREELANCER | CLIENT | ADMIN)
- `subscriptionPlan` (FREELANCER_FREE | FREELANCER_PRO | CLIENT_STARTER | etc.)
- `tokens` (int, freelancer application credits)
- `tokenResetAt` (timestamp)
- `createdAt`, `updatedAt`

#### Profile
- `id` (UUID, PK)
- `userId` (FK → User)
- `firstName`, `lastName`
- `title` (professional title)
- `bio` (text)
- `skills` (text[], taxonomy)
- `hourlyRate`, `monthlyRate` (decimal)
- `location`, `timezone`
- `profilePictureUrl`
- `verified` (boolean)
- `completionScore` (0-100)

#### Job
- `id` (UUID, PK)
- `slug` (unique, URL-safe)
- `title`, `description`
- `category` (taxonomy)
- `budgetType` (FIXED | HOURLY)
- `budgetAmount` (decimal)
- `status` (DRAFT | OPEN | PAUSED | CLOSED)
- `clientId` (FK → User)
- `skills` (text[])
- `experienceLevel`
- `deadline` (timestamp)
- `createdAt`, `updatedAt`

#### Proposal
- `id` (UUID, PK)
- `jobId` (FK → Job)
- `freelancerId` (FK → User)
- `coverLetter` (text)
- `proposedRate` (decimal)
- `status` (PENDING | ACCEPTED | REJECTED | WITHDRAWN)
- `aiScore` (int, 0-100)
- `aiAnalysis` (jsonb)
- `createdAt`

#### Contract
- `id` (UUID, PK)
- `jobId` (FK → Job)
- `freelancerId` (FK → User)
- `clientId` (FK → User)
- `status` (ACTIVE | COMPLETED | TERMINATED)
- `startDate`, `endDate`
- `totalValue` (decimal)
- `signedAt`

#### Milestone
- `id` (UUID, PK)
- `contractId` (FK → Contract)
- `title`, `description`
- `amount` (decimal)
- `dueDate` (timestamp)
- `status` (PENDING | FUNDED | SUBMITTED | APPROVED | PAID)
- `createdAt`, `paidAt`

#### Message
- `id` (UUID, PK)
- `conversationId` (UUID)
- `senderId` (FK → User)
- `recipientId` (FK → User)
- `content` (text)
- `readAt` (timestamp, nullable)
- `createdAt`

#### Subscription
- `id` (UUID, PK)
- `userId` (FK → User)
- `plan` (FREELANCER_PRO | CLIENT_BUSINESS | etc.)
- `status` (ACTIVE | CANCELED | PAST_DUE)
- `currentPeriodStart`, `currentPeriodEnd`
- `cancelAtPeriodEnd` (boolean)
- `braintreeSubscriptionId`

### Enterprise Tables

#### ApiKey
- `id` (UUID, PK)
- `userId` (FK → User)
- `name` (key label)
- `key` (hashed, unique)
- `scopes` (text[], permissions)
- `expiresAt` (nullable)
- `lastUsedAt`

#### WebhookEndpoint
- `id` (UUID, PK)
- `userId` (FK → User)
- `url` (webhook URL)
- `secret` (HMAC secret)
- `events` (text[], subscribed events)
- `enabled` (boolean)

#### WebhookDelivery
- `id` (UUID, PK)
- `endpointId` (FK → WebhookEndpoint)
- `event` (event type)
- `payload` (jsonb)
- `status` (PENDING | SUCCESS | FAILED)
- `attempts` (int)
- `nextRetryAt` (timestamp)
- `deliveredAt`

#### FraudFlag
- `id` (UUID, PK)
- `userId` (FK → User)
- `reason` (text)
- `severity` (LOW | MEDIUM | HIGH | CRITICAL)
- `trustScore` (0-100)
- `autoSuspended` (boolean)
- `createdAt`

### Support & Admin Tables

#### SupportTicket
- `id` (UUID, PK)
- `userId` (FK → User)
- `subject`, `description`
- `status` (OPEN | IN_PROGRESS | RESOLVED | CLOSED)
- `priority` (LOW | NORMAL | HIGH)
- `createdAt`, `resolvedAt`

#### AuditLog
- `id` (UUID, PK)
- `userId` (FK → User, nullable)
- `action` (text)
- `entity` (table name)
- `entityId` (UUID)
- `changes` (jsonb)
- `ipAddress`
- `createdAt`

---

## 📁 Project Structure

```
jobhorizons/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Auth route group
│   │   │   ├── signin/
│   │   │   ├── signup/
│   │   │   ├── forgot-password/
│   │   │   └── verify-email/
│   │   ├── (dashboard)/            # Dashboard route group
│   │   │   ├── dashboard/
│   │   │   ├── messages/
│   │   │   ├── notifications/
│   │   │   └── settings/
│   │   ├── (admin)/                # Admin route group
│   │   │   └── admin/
│   │   │       ├── users/
│   │   │       ├── jobs/
│   │   │       ├── verifications/
│   │   │       └── analytics/
│   │   ├── (public)/               # Public routes
│   │   │   ├── jobs/
│   │   │   ├── freelancers/
│   │   │   ├── about/
│   │   │   └── pricing/
│   │   ├── api/                    # API routes
│   │   │   ├── trpc/[trpc]/
│   │   │   ├── v1/
│   │   │   ├── cron/
│   │   │   ├── webhooks/
│   │   │   └── auth/
│   │   ├── _trpc/                  # tRPC client provider
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Homepage
│   │   └── globals.css             # Global styles
│   ├── components/                 # React components
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── dashboard/              # Dashboard widgets
│   │   ├── jobs/                   # Job-related components
│   │   ├── proposals/              # Proposal components
│   │   ├── admin/                  # Admin components
│   │   ├── shared/                 # Shared utilities
│   │   └── layout/                 # Layout components
│   ├── server/                     # Server-side code
│   │   └── trpc/
│   │       ├── routers/            # tRPC routers
│   │       ├── context.ts          # tRPC context
│   │       └── index.ts            # Router aggregation
│   ├── lib/                        # Utility libraries
│   │   ├── supabase/               # Supabase clients
│   │   ├── ai/                     # AI integrations
│   │   ├── braintree.ts            # Payment processing
│   │   ├── webhooks/               # Webhook delivery
│   │   ├── fraud-detection.ts      # Fraud algorithms
│   │   ├── feature-enforcement.ts  # Plan gating
│   │   └── security.ts             # ID encoding
│   ├── hooks/                      # React hooks
│   │   ├── useAuth.ts
│   │   └── useDashboard.ts
│   ├── types/                      # TypeScript types
│   │   ├── database.types.ts       # Supabase generated
│   │   └── index.ts
│   ├── constants/                  # App constants
│   │   ├── categories.ts
│   │   ├── skills.ts
│   │   └── plans.ts
│   └── middleware.ts               # Next.js middleware
├── supabase/
│   ├── functions/                  # Edge functions
│   │   └── send-email/
│   └── migrations/                 # SQL migrations
├── public/                         # Static assets
├── .env.example                    # Environment template
├── next.config.ts                  # Next.js config
├── tailwind.config.ts              # Tailwind config
├── tsconfig.json                   # TypeScript config
├── vercel.json                     # Vercel config (cron jobs)
└── package.json
```

---

## 📜 Scripts

### Development

```bash
# Start development server (with nodemon)
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run linter
npm run lint
```

### Database

```bash
# Run Supabase migrations
supabase db push

# Generate TypeScript types from Supabase schema
supabase gen types typescript --local > src/types/database.types.ts

# Test database connection
node scripts/test-database.js
```

### Testing

```bash
# Run Playwright tests (after creating test suites)
npx playwright test

# Run tests in UI mode
npx playwright test --ui
```

---

## 📊 Analytics & Monitoring

### Vercel Analytics

**Features:**
- Real-time visitor tracking
- Page view metrics
- Unique visitor counts
- Top pages and referrers
- Geographic distribution
- Device and browser analytics

**Access**: Vercel Dashboard → Your Project → Analytics

### Vercel Speed Insights

**Metrics Tracked:**
- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)
- **FCP** (First Contentful Paint)
- **TTFB** (Time to First Byte)

**Access**: Vercel Dashboard → Your Project → Speed Insights

### Sentry Error Tracking

**Configuration:**
```env
SENTRY_DSN=https://xxx@sentry.io/xxx
```

**Features:**
- Error and exception tracking
- Performance monitoring
- Session replay
- Release tracking
- Custom error tagging

---

## 🔒 Security

### Authentication & Authorization
- ✅ Supabase Auth with email verification
- ✅ JWT-based session management
- ✅ Role-based access control (RBAC)
- ✅ Protected routes via middleware
- ✅ Subscription-gated features

### Data Protection
- ✅ Row-Level Security (RLS) on all tables
- ✅ Encrypted connections (HTTPS/TLS)
- ✅ Secure password hashing
- ✅ Input validation with Zod schemas
- ✅ Output sanitization

### API Security
- ✅ API key authentication
- ✅ Scoped permissions
- ✅ Rate limiting (100-1000 req/hr)
- ✅ Request logging and audit trail
- ✅ HMAC-signed webhooks

### Fraud Prevention
- ✅ Disposable email detection
- ✅ Duplicate content detection
- ✅ Trust score calculation (0-100)
- ✅ Auto-suspension for high-risk accounts
- ✅ Admin review queue

### Security Headers
```
Content-Security-Policy: Strict CSP
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=63072000
```

---

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add new feature"
   ```
6. **Push to your fork**
7. **Create a Pull Request**

### Commit Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended rules
- **Prettier**: (optional) for consistent formatting
- **Components**: Use server components by default
- **Naming**: camelCase for variables, PascalCase for components

---

## 📄 License

**MIT** - See [LICENSE](./LICENSE) for details.

---

## 📞 Support

- **GitHub Issues**: For bug reports and feature requests
- **Discussions**: For questions and community help
- **Security Issues**: See [SECURITY.md](./SECURITY.md) for responsible disclosure

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) by Vercel
- [Supabase](https://supabase.com/) for backend infrastructure
- [Anthropic Claude](https://www.anthropic.com/) for AI capabilities
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) for styling

---

**Built with ❤️ by [Niepres John](https://niepresjohn.com)**

*Last Updated: March 2026*
