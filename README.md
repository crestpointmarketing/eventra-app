# Eventra

Team event planning, lead management, task tracking and AI assistance built with Next.js, Supabase and Vercel.

## Connected services

- GitHub: https://github.com/crestpointmarketing/eventra-app
- Supabase project: https://supabase.com/dashboard/project/tbicyyhprqbhimhrihgn
- Vercel project: https://vercel.com/crestpointmarketings-projects/eventra-app

## Development

Use Node.js 22 (22.15 or newer within 22.x).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the intended Supabase project. Set server-only `OPENAI_API_KEY` for content, email, lead and task AI; set `PERPLEXITY_API_KEY` for researched event discovery and analysis. Never put provider secrets in a `NEXT_PUBLIC_` variable or commit environment files. Browser requests use the signed-in user's session and database policies.

## Team access

Business records are shared among explicit members in `public.eventra_members`. A registered Auth account alone does not grant access. An administrator must verify an account and add its Auth user ID to this table through the Supabase dashboard. The application cannot grant itself membership. Owner/assignee/uploader fields determine deletion rights; members cannot take ownership of each other's records.

The initial migration enrolls existing Auth users already associated with project records. Imported rows in `public.users` are profile records, not authenticated accounts. Shared event links expire after 30 days and return a restricted public projection. Uploaded files are private and accessed with temporary signed URLs.

## Checks and releases

```sh
npm run check
npm audit
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx vercel deploy
```

`npm run check` runs lint, TypeScript, Node tests (including migration/RLS/transaction tests in PGlite) and the production build. GitHub Actions repeats these checks. Link and verify the intended Supabase and Vercel projects before any release. Database migrations are under `supabase/migrations`; apply reviewed migrations before dependent application code. For production deployment use `deploy.ps1 -Environment Production` or `deploy.sh --prod` after verification. Environment variables must also be configured in Vercel for the deployment's environment.

`tests/production-smoke.mjs <deployment-url>` is a manual integration check requiring authenticated Supabase and Vercel CLIs. It creates isolated synthetic fixtures, invokes deployed routes through Vercel protection, and removes its fixtures in a finally block. It writes credential-free evidence to `audit-evidence`. Do not run this check automatically for untrusted pull requests.

## Operational behavior

AI requests require team membership, bounded JSON bodies, and database-backed quotas (20 per minute and 500 per UTC day per member). Provider failures surface as errors; generated material remains subject to user review. The email composer records manually sent emails; it does not deliver emails itself. CSV imports accept up to 1,000 rows / 5 MB and report individual failures; optional AI processing runs in the browser, so keep the tab open. For larger imports, a durable background job queue is a future improvement.

Audit reports and release evidence are stored locally in `audit-evidence` and dated report files. They are excluded from Git and deployment uploads because they may contain internal operational details.
