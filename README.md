# Tandem Expenses (Tandem Finance)

A shared personal-finance app for **two people running one household**. Both partners record income and expenses with attribution (who created it, who paid). They also manage categories and monthly budgets, compare months, get alerts, and track shared savings goals. AI Insights come later and only suggest; they never change data.

Simple, correct and usable. It is a personal app for a couple, not an enterprise platform.

## Tech stack

| | |
|---|---|
| **Web** (`apps/web`) | React 19 · Vite · TypeScript · Tailwind CSS v4 · shadcn/ui · TanStack Query · React Router · React Hook Form + Zod · Vitest |
| **API** (`apps/api`) | NestJS · Prisma · PostgreSQL · own email/password JWT auth · Zod · Jest |
| **Shared** (`packages/shared`) | `@tandem/shared`: Zod API contract, enums, constants |
| **Hosting** | Web on Cloudflare Pages · API on Google Cloud Run · PostgreSQL on Supabase |

Money is stored as `NUMERIC(14,2)` and sent as decimal strings. The API is the source of truth for every financial calculation.

## Repository structure

```text
apps/api          NestJS backend (modular monolith)
apps/web          React SPA
packages/shared   Shared Zod contract (@tandem/shared)
design/           Google Stitch screens + design system (DESIGN.md)
docs/             Product overview, business rules, roadmap
```

## Documentation

- [Product overview](docs/PRODUCT_OVERVIEW.md)
- [Business rules](docs/BUSINESS_RULES.md)
- [Development roadmap and decisions](docs/DEVELOPMENT_ROADMAP.md)
- [Design system](design/tandem_finance/DESIGN.md)
- Development guidelines: [`CLAUDE.md`](CLAUDE.md), [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md), [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md)

## Run locally

Requirements: Node 22, pnpm 9 and Docker.

```bash
pnpm install                                   # also runs prisma generate
pnpm db:up                                     # PostgreSQL 16 on localhost:5433
pnpm --filter @tandem/shared build
cp apps/api/.env.example apps/api/.env         # first time only
pnpm --filter @tandem/api exec prisma migrate deploy
pnpm --filter @tandem/api db:seed              # dev-only demo household + default categories
pnpm dev:api                                   # http://localhost:3001/api/health
pnpm dev:web                                   # http://localhost:5173 (proxies /api → 3001)
```

Tests: `pnpm -r test`. API e2e tests (need Postgres running): `pnpm --filter @tandem/api test:e2e`.
