# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in JobHorizons, please **do not** open a public GitHub issue.

Instead, please report it responsibly by emailing the maintainers directly. You can find contact information in the repository's profile or README.

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

You can expect an acknowledgement within 48 hours and a resolution timeline within 7 days for critical issues.

## Scope

This policy applies to the JobHorizons codebase in this repository. It does not cover third-party services (Supabase, Braintree, Anthropic, etc.) — please report those directly to the respective vendors.

## Security Best Practices for Deployers

- Never commit `.env` files — use `.env.example` as a reference only
- Rotate all API keys and secrets before going to production
- Enable RLS (Row Level Security) on all Supabase tables (already configured in migrations)
- Set `FRAUD_PREVENTION_V1=true` in production environments
- Use a strong, randomly-generated `CRON_SECRET`, `NEXTAUTH_SECRET`, and `ADMIN_SECRET` (32+ characters each)
- Restrict your Google Maps API key to specific HTTP referrers in the Google Cloud Console
