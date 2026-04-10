# ShipLog

ShipLog turns shipped work into reviewable feature summaries and LinkedIn-ready draft posts.

This repository now includes Phase 1 plus initial Phase 2 integration:

- Next.js 14 (App Router) + TypeScript + Tailwind
- NextAuth with Linear + Notion OAuth provider wiring
- Prisma schema for users, connections, sessions, and cached features
- Review -> Generate -> Edit flow with template-based draft generation

## 1) Prerequisites

- Node.js 20+
- PostgreSQL (local or hosted)
- Linear OAuth app (scope: `read`)
- Notion OAuth app (read content)

## 2) Environment variables

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Required vars:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `LINEAR_CLIENT_ID`
- `LINEAR_CLIENT_SECRET`
- `NOTION_CLIENT_ID`
- `NOTION_CLIENT_SECRET`

## 3) Install and initialize database

```bash
npm install
npm run prisma:generate
npm run prisma:push
```

## 4) Run locally

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Current Phase 1 routes

- `/onboarding` - connect Linear/Notion + choose cadence
- `/review` - pick date range, refresh from Linear, review/select features, swap PRD matches
- `/generate` - choose output mode and tone label
- `/edit` - edit/copy generated draft(s)

## Troubleshooting OAuth

If sign-in finishes at `/api/auth/callback/...` and does not return to the app:

1. Confirm Postgres is running and `DATABASE_URL` in `.env.local` is correct, then run `npm run prisma:push` (NextAuth needs the Prisma tables to create users and sessions).
2. Set `NEXTAUTH_URL` to the exact origin you use in the browser (for example `http://localhost:3000`) and set a strong `NEXTAUTH_SECRET`. Restart `npm run dev` after any env change.
3. Add `NEXTAUTH_DEBUG="true"` to `.env.local` and watch the terminal while reproducing; you should see `[NextAuth]` logs.
4. On failure, NextAuth redirects to `/auth/error?error=...` with a short code (for example `OAuthCallback` or `Configuration`).

## Notes

- The app caches pulled Linear issues in `Feature` rows so the review screen reads from DB.
- Phase 1 generation is template-based (no AI calls yet).
