# Tandem Expenses — Project Instructions (root)

Project-wide rules for Claude Code. App-specific rules live in:

- `apps/api/CLAUDE.md` — backend (NestJS, Prisma, PostgreSQL, JWT)
- `apps/web/CLAUDE.md` — frontend (React, Vite, shadcn/ui, TanStack Query)

When working inside an app, follow **this file plus that app's CLAUDE.md**. If they appear to conflict, stop and ask; do not pick one silently.

---

## 1. Product

**Tandem Expenses** (brand in the UI: **Tandem Finance**) is a shared personal-finance app for **two people (a couple)** who run one household together.

Both partners can:

- record income and expenses, with who created and who paid each one
- manage custom categories (envelopes)
- set optional monthly budgets per expense category
- follow monthly spending and compare months (Financial Progress)
- get notifications and alerts
- create and track shared savings goals
- (later) get AI Insights that suggest but never act

It is a personal app for two people, **not** an enterprise finance platform. Prefer simple, correct and usable over clever. Avoid overengineering.

**Sources of truth** (read before implementing a feature; do not edit them without being asked):

| Topic | File |
|---|---|
| Product, screens, terminology | `docs/PRODUCT_OVERVIEW.md` |
| Business rules and formulas | `docs/BUSINESS_RULES.md` |
| Data model, phases, decisions | `docs/DEVELOPMENT_ROADMAP.md` (see "Decisions (resolved in P0)") |
| Visual design (Google Stitch) | `design/` (`design/tandem_finance/DESIGN.md` + one folder per screen) |

The docs sometimes say `docs/design/`; the real folder is `design/` at the root.

**Out of scope for the MVP:** bank sync, APY/vaults, autopilot money movement, settlements between partners, what-if engines. The mockups show some of these; do not build them.

---

## 2. Repository structure

pnpm workspace monorepo. Do not add new apps or packages without approval.

```text
family-expenses/
├── apps/
│   ├── api/              # NestJS + Prisma backend         → apps/api/CLAUDE.md
│   └── web/              # React + Vite SPA frontend       → apps/web/CLAUDE.md
├── packages/
│   └── shared/           # @tandem/shared — Zod schemas, enums, API contract types, constants
├── design/               # Google Stitch screens + DESIGN.md (read-only reference)
├── docs/                 # Product overview, business rules, roadmap
├── scripts/              # Dev helpers (start-tandem-claude.sh)
├── .claude/skills/       # tandem-phase skill (agent teams)
├── docker-compose.yml    # Local PostgreSQL 16 on :5433
├── pnpm-workspace.yaml
├── CLAUDE.md
└── README.md
```

Ownership:

- **`apps/web` owns the frontend:** UI, routing, client session handling, display formatting, form UX.
- **`apps/api` owns the backend:** auth, authorization, persistence, business rules and **every authoritative financial calculation**.
- **`packages/shared` owns the API contract:** request/response Zod schemas, enums and shared constants. It contains no business logic, no I/O and no framework code.

---

## 3. Technology stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite, TypeScript (strict), Tailwind CSS v4, shadcn/ui, TanStack Query, React Router, React Hook Form + Zod, Recharts, Vitest + React Testing Library |
| Backend | Node.js 22, NestJS 10, TypeScript (strict), Prisma 5, PostgreSQL 16, Zod validation, Jest + Supertest |
| Contract | `@tandem/shared` Zod schemas used by both apps |
| Auth | Our own email/password auth issuing JWTs from the API (**not** Supabase Auth) |
| Database | PostgreSQL. Local: Docker (`docker-compose.yml`, port 5433). Hosted: Supabase **PostgreSQL only** |
| Hosting | Web → Cloudflare Pages. API → Google Cloud Run (stateless container) |
| Source control / CI | GitHub + GitHub Actions (the repo is not under git yet; that is a P1 follow-up) |

Not yet installed: React Hook Form and Recharts. Add each when the first feature needs it, and say why.

**Validation is Zod everywhere.** Do not add class-validator or class-transformer.

---

## 4. High-level architecture

```text
Browser (Cloudflare Pages)          Cloud Run                       Supabase
┌──────────────────────┐  REST/JSON ┌──────────────────────────┐  Prisma ┌────────────┐
│ apps/web (SPA)       │──────────▶│ apps/api (NestJS)         │───────▶│ PostgreSQL │
│ TanStack Query cache │ Bearer JWT│ modular monolith          │        └────────────┘
└──────────────────────┘           │ auth + household guard    │
           ▲                       │ use cases + domain rules  │
           └──── @tandem/shared ───┴──────────────────────────┘
```

- Two independently deployable apps that talk only over a REST API under `/api`.
- The backend is a **modular monolith**: one deployable, one module per feature. No microservices.
- Both apps are organised **by feature**, using Clean Architecture layers only where they add value:

| Layer | Holds | Must not depend on |
|---|---|---|
| Domain | business types, rules, calculations, domain errors | frameworks, Prisma, HTTP, React |
| Application | use cases (API) or hooks that orchestrate (web) | presentation details |
| Infrastructure | Prisma repositories, HTTP clients, external services | presentation |
| Presentation | controllers and DTO wiring (API); pages and components (web) | infrastructure internals |

Not every feature needs every layer. A feature with no real rules can skip the domain layer.

### Feature names (use the same names in both apps)

| Feature | API module (`apps/api/src/modules/…`) | Web feature (`apps/web/src/features/…`) | Route |
|---|---|---|---|
| auth | `auth` | `auth` | `/sign-in`, `/create-account`, `/reset-password` |
| households | `households` | `households` | `/settings` |
| categories | `categories` | `categories` | `/categories` (with budgets) |
| transactions | `transactions` | `transactions` | `/transactions` |
| budgets | `budgets` | `budgets` | `/categories` |
| dashboard | `summaries` (period aggregates) | `dashboard` | `/dashboard` |
| financial-progress | `financial-progress` | `financial-progress` | `/progress` |
| savings | `savings` | `savings` | `/goals` |
| notifications | `notifications` | `notifications` | `/notifications` |
| ai-insights | `ai-insights` | `ai-insights` | `/insights` |

---

## 5. Shared principles

- **Simple first.** Add an abstraction only when it removes real duplication or isolates something that changes for a different reason (the database, an external provider). No speculative interfaces, generic base classes or "managers".
- **SRP and low coupling.** One reason to change per module, class or component. Features talk through public entry points, never through each other's internals.
- **Dependency inversion at real boundaries only:** repositories, external providers (email, AI), the clock.
- **TypeScript strict** everywhere. No `any`; use `unknown` and narrow it. No `@ts-ignore` without a comment explaining why.
- **Consistency beats preference.** Copy the existing pattern in the codebase before inventing a new one.

### Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Files and folders | kebab-case | `create-transaction.use-case.ts`, `transaction-form.tsx` |
| Classes, types, React components | PascalCase | `CreateTransactionUseCase`, `TransactionForm` |
| Functions, variables, hooks | camelCase (hooks start with `use`) | `calculateSavingsRate`, `useTransactions` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_CURRENCY` |
| Enum values | SCREAMING_SNAKE_CASE | `INCOME`, `EXPENSE`, `PARTNER_1` |
| Zod schemas | camelCase + `Schema`; inferred type is PascalCase | `createTransactionSchema` → `CreateTransactionInput` |
| JSON fields | camelCase | `transactionDate`, `paidById` |
| REST paths | plural, kebab-case nouns | `/api/transactions`, `/api/savings-goals/:id/contributions` |
| Prisma models | PascalCase singular | `Transaction`, `SavingsGoal` |

### Business terminology (use exactly these words)

Household / **Shared Space**, Partner 1 / Partner 2, **created by** vs **paid by**, category (UI may say envelope), budget, **Net Cash Flow Buffer**, **Available Balance**, savings rate, budget utilization, savings goal, contribution, Financial Progress, notification, AI Insights / Tandem Co-pilot.

---

## 6. Financial business rules (summary)

Full rules: `docs/BUSINESS_RULES.md`. Both apps must use these definitions without changing them.

**Household**
- One household (Shared Space) with two members, Partner 1 and Partner 2, who have **equal permissions**.
- All financial data belongs to the household, not to a person.
- Every transaction records `createdById`. It may record `paidById` (who actually paid). Attribution does not change the household balance.
- An optional default split (for example 50/50) is used for display and planning only. No settlements.

**Transactions**
- Type is `INCOME` or `EXPENSE`.
- Description, amount, category and `transactionDate` are required. The amount must be **> 0**.
- The category type must match the transaction type.
- The default currency is **ARS**. Income increases the balance; expenses decrease it.
- Editing or deleting a transaction must be reflected in every summary.

**Categories**
- Unlimited custom categories, each with a name, icon, color and type.
- New households get the default templates (`DEFAULT_CATEGORIES` in `@tandem/shared`).
- A category used by any transaction is **deactivated, never hard-deleted**. Historical transactions keep their category.

**Budgets**
- Optional, monthly, one per expense category per month.
- Utilization is calculated from actual transactions.
- Changing a budget never modifies transactions.
- Status bands: `< 80%` within, `80–99.99%` approaching, `≥ 100%` exceeded.

**Savings**
- Goals are shared. Contributions are stored separately (`SavingsContribution`) and are **never counted as expenses**.
- Contributions reduce the Available Balance.

**Formulas.** All are computed by the API for a period, using `transactionDate` (never `createdAt`) and the household's timezone.

| Metric | Formula | Zero denominator |
|---|---|---|
| Net Cash Flow Buffer (balance before savings) | `income − expenses` | — |
| Available Balance (after savings) | `income − expenses − savings contributions` | — |
| Savings rate | `(income − expenses) / income × 100` | income = 0 → `null` ("not available") |
| Budget utilization | `category expenses / category budget × 100` | no budget → `null` |
| Savings goal progress | `current saved / target × 100` | target is always > 0 |
| Monthly spending variation | `(current − previous) / previous × 100` | previous = 0 → `null` |

- Month-over-month comparisons use **equivalent periods**: day 1–N of this month against day 1–N of the previous month.
- An increase in spending is not the same as exceeding a budget. Keep the two concepts separate.

**Money and precision**
- Stored as PostgreSQL `NUMERIC(14,2)`, handled as Prisma `Decimal` (decimal.js) in the API.
- Sent over the API as **decimal strings** such as `"1234.50"`, never as JSON numbers.
- Percentages are sent as decimal strings with 2 decimals (`"82.50"`), or `null` when undefined. Rounding is half-up.
- **Never use JavaScript floating-point arithmetic** for authoritative money math. The web only formats values; it does not compute totals.

---

## 7. Authentication and security

- **Auth model:** email and password, handled by the API.
  - Passwords are hashed with a slow hash (argon2id preferred; settle it in P1).
  - The API issues a short-lived **access JWT**, sent as `Authorization: Bearer`, plus a **refresh token**.
  - How the refresh token is stored on the client (httpOnly cookie with rotation, or another option) is decided **at the start of P1** and recorded in the roadmap's decisions table. The PO currently leans towards an httpOnly cookie with rotation. Web on Cloudflare Pages and API on Cloud Run are cross-site, so cookie settings and CORS credentials must account for that.
  - Supabase Auth is **not** used.
- **Household authorization on every protected financial operation.** The API resolves the user's household from the authenticated user's membership. It **never trusts** a `householdId` or `userId` sent by the client unless it has checked it against that membership. Accessing another household's data returns `404`, so the API does not reveal that the resource exists.
- The API is **stateless** (Cloud Run): no in-memory sessions, and no local files as state.
- **Secrets** (DB URL, JWT secrets, provider keys) live only in API environment variables. **Nothing secret goes into the web bundle**: every `VITE_*` variable is public.
- Never log passwords, tokens, full request bodies or full financial records.

---

## 8. API contract

- **Base path:** `/api`. Locally the API runs on `http://localhost:3001`, and Vite proxies `/api` to it from `:5173`. Port 3000 is used by another local app.
- **JSON** uses camelCase. Dates are `YYYY-MM-DD` strings (`transactionDate`, `targetDate`); timestamps are ISO-8601 UTC.
- **Schemas:** every request and response shape is a Zod schema in `@tandem/shared`. The API validates input with it; the web parses responses with it. Change the contract **in `@tandem/shared` first**, rebuild it (`pnpm --filter @tandem/shared build`), then update both apps in the same change.
- **Lists** return `{ "items": [...] }`. When pagination is needed, add `nextCursor` and accept `limit` and `cursor` query parameters.
- **Periods:** query by `year` and `month` (1–12), or `from` and `to` (`YYYY-MM-DD`).
- **Partner filter:** `partner=PARTNER_1|PARTNER_2`. Leave it out for "All Shared". It filters on the **paid by** attribution, and savings rate and utilization use the same filtered set (BUSINESS_RULES §4).
- **Errors** use the NestJS shape `{ "statusCode", "message", "error"? }`. Validation errors return `400` with `{ "message": "Validation failed", "issues": [{ "path", "message" }] }`.

| Status | Meaning |
|---|---|
| `401` | Not authenticated |
| `403` | Authenticated but not allowed |
| `404` | Not found, or belongs to another household |
| `409` | Conflict (duplicate, still in use) |
| `422` | A business rule was violated |

---

## 9. Testing expectations

- **Every financial formula** has unit tests in the API's domain layer, including zero denominators, rounding and partner filters.
- **Every protected endpoint** has an e2e test proving that **one household cannot read or change another household's data**.
- Use cases are tested with fake repositories. Repositories and e2e tests run against the real Postgres (`test/*.e2e-spec.ts`).
- Web: test components that have behavior, plus hooks and formatters, with Vitest and React Testing Library. Avoid snapshot-only tests.
- A change is not done while related tests fail. Never delete or weaken a test to make it pass.

---

## 10. Code quality and commands

```bash
pnpm install
pnpm db:up                                   # Postgres on :5433
pnpm --filter @tandem/shared build           # required before running api/web
pnpm dev:api        # :3001        pnpm dev:web   # :5173
pnpm -r test        # all tests    pnpm -r build  # all builds (includes tsc)
pnpm --filter @tandem/web typecheck
pnpm --filter @tandem/api test:e2e           # needs Postgres running
```

- **ESLint and Prettier are not configured yet.** Until they are, the type check and build are the quality gate. Propose a lint setup as its own change; don't add one silently.
- **Keep diffs focused.** No drive-by refactors, renames or reformatting of unrelated code.
- **New dependencies:** say what each one is for and why the existing stack can't cover it. Prefer well-maintained, widely used packages.

### Known environment quirks

- **Stray Jest 26:** `~/node_modules` holds an old Jest 26, so `apps/api` declares `jest-cli` locally. Keep it.
- **`@prisma/client` in Jest:** the API's Jest configs map `@prisma/client` explicitly to work around pnpm resolution.
- **shadcn CLI:** it sometimes writes `import { cn } from "cn"` and installs a stray `cn` package. Fix the import to `@/lib/utils` and remove the package.
- **Headless Chrome screenshots:** the minimum viewport is 500px.

---

## 11. Git and workflow

- **Planning:** Linear project **Tandem Expenses** (`P-FOR-2`), team **Forge-henry** (`FOR`), one milestone per phase (P0–P6). Issue titles use `[BE]`, `[FE]`, `[QA]` or `[PO]` plus a roadmap id, for example `[P2-003]`.
- **Branches:** use Linear's branch name (`merchanha/for-13-…`). One issue per branch or PR where practical.
- **Commits:** conventional style with the issue key, for example `feat(transactions): add partner filter (FOR-42)`.
- **Linear status:** update it as work progresses, whenever Linear tools are available.
- **Prisma migrations** are committed and never edited after they are applied anywhere shared.

### Agent teams

User settings enable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and `teammateMode: tmux`.

```bash
./scripts/start-tandem-claude.sh     # starts Claude inside tmux (brew install tmux first)
```

Inside Claude, run `/tandem-phase P1` (one milestone per session, P0–P6). The skill lives at `.claude/skills/tandem-phase/SKILL.md`. Teammates are BE, FE, QA and PO; each claims only issues with its own prefix in the current milestone.

---

## 12. How Claude should work here

**Before implementation**
1. Inspect the relevant code. Never assume something exists without checking.
2. Read the relevant docs: business rules, roadmap phase, and the design screen.
3. Follow the conventions already in the code.
4. Identify the affected features, the contract changes in `@tandem/shared`, and any migrations.
5. Propose a short plan.
6. **Wait for approval before substantial implementation.** Running `/tandem-phase PN` approves that milestone's issues. Anything outside the milestone, any architecture change or any new dependency still needs a question first.

**During implementation**
1. Follow the existing architecture and patterns. Reuse existing components, services and schemas.
2. Keep changes focused; no unrelated refactoring.
3. Keep TypeScript strict, validate input at the boundary, and add or update tests.
4. Keep financial math in the API domain layer and money in Decimal or decimal strings.

**After implementation**
1. Run lint (once configured), the type checks, the relevant tests and the builds.
2. Report the files you changed, the architectural decisions and why, and the remaining work.
3. If something was skipped or fails, say so plainly.

**Do not** create unnecessary files, abstractions, docs or examples. Do not build post-MVP features. Do not touch `design/` or `docs/` unless asked.
