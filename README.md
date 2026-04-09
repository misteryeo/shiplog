# ShipLog

ShipLog turns shipped Linear work into reviewable feature summaries and LinkedIn-ready draft posts.

This repository now includes Phase 1 foundations:

- Next.js 14 (App Router) + TypeScript + Tailwind
- NextAuth with Linear OAuth provider wiring
- Prisma schema for users, connections, sessions, and cached features
- Review -> Generate -> Edit flow with template-based draft generation

## 1) Prerequisites

- Node.js 20+
- PostgreSQL (local or hosted)
- Linear OAuth app (scope: `read`)

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

- `/onboarding` - connect Linear + choose cadence
- `/review` - pick date range, refresh from Linear, review/select features
- `/generate` - choose output mode and tone label
- `/edit` - edit/copy generated draft(s)

## Notes

- The app caches pulled Linear issues in `Feature` rows so the review screen reads from DB.
- Phase 1 generation is template-based (no AI calls yet).
