# Contributing to JobHorizons

Thank you for your interest in contributing! Here's how to get started.

## Getting Started

1. Fork the repository and clone your fork
2. Copy `.env.example` to `.env.local` and fill in your own credentials
3. Install dependencies: `npm install`
4. Set up a local Supabase project: `npx supabase start`
5. Apply migrations: `npx supabase db push`
6. Start the dev server: `npm run dev`

## Development Guidelines

- **TypeScript** — all new code must be typed; avoid `any`
- **tRPC** — API logic belongs in `src/server/trpc/routers/`; keep routers focused
- **Supabase** — use `createClient()` for user-scoped queries, `createAdminClient()` only for privileged server operations
- **Tailwind** — use utility classes only; avoid inline styles
- **Env vars** — all new environment variables must be added to `src/env.ts` and `.env.example`

## Pull Request Process

1. Open an issue first for significant changes to discuss the approach
2. Keep PRs focused — one concern per PR
3. Ensure `npm run lint` passes before submitting
4. Update `.env.example` if you add new environment variables
5. Update `README.md` if your change affects setup or configuration

## Security

If you find a security vulnerability, please follow the [Security Policy](./SECURITY.md) and do **not** open a public issue.
