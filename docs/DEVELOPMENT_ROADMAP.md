# Tandem Finance — Development Roadmap

**Version:** 1.0  
**Product:** Tandem Finance  
**Aligned with:** `docs/PRODUCT_OVERVIEW.md`, `docs/BUSINESS_RULES.md`, `docs/design/`  
**Purpose:** Implementation plan, data model, and Linear-ready milestones/issues

---

## 1. Goals

Build an MVP that two partners can use to:

1. Share one household **Shared Space**
2. Track income and expenses with partner attribution
3. Manage **Categories & Budgets** (joint envelopes)
4. Compare monthly progress
5. Get alerts, savings goals, and AI Insights (Tandem Co-pilot)

Design mockups may show bank sync, vaults, APY, and autopilot. Those stay **out of MVP** unless explicitly promoted later.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React SPA on Vite (decided in P0, see §11 Decisions) |
| UI | Tailwind CSS + shadcn/ui |
| Data fetching / cache | TanStack Query |
| Forms / validation (FE) | React Hook Form + Zod (recommended) |
| Backend | NestJS |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (access + refresh), email/password |
| API style | REST (OpenAPI optional) |
| Money storage | `Decimal` in Prisma / `NUMERIC` in PostgreSQL — never floating point |
| Default currency | ARS |

### Suggested repo layout

```text
family-expenses/
  apps/
    web/                 # React + Tailwind + shadcn + TanStack Query
    api/                 # NestJS + Prisma + JWT
  packages/
    shared/              # shared Zod schemas / DTO types (optional later)
  docs/
```

Monorepo is optional. A simple `frontend/` + `backend/` split is fine for MVP.

---

## 3. Architecture Overview

```text
┌──────────────────────────┐
│  React (shadcn/Tailwind) │
│  TanStack Query          │
└────────────┬─────────────┘
             │ JWT Bearer
             ▼
┌──────────────────────────┐
│  NestJS API              │
│  Auth / Household guards │
│  Domain modules          │
└────────────┬─────────────┘
             │ Prisma
             ▼
┌──────────────────────────┐
│  PostgreSQL              │
└──────────────────────────┘
```

### Backend module map (NestJS)

| Module | Responsibility |
|---|---|
| `AuthModule` | Register, login, refresh, logout, password reset |
| `UsersModule` | Profile |
| `HouseholdsModule` | Shared Space, members, invites, default split |
| `CategoriesModule` | Envelopes CRUD + defaults seed |
| `TransactionsModule` | Income/expense CRUD, filters |
| `BudgetsModule` | Monthly category budgets + utilization |
| `SummariesModule` | Dashboard / period aggregates |
| `ProgressModule` | MoM comparisons |
| `NotificationsModule` | Alerts CRUD + read state |
| `SavingsModule` | Goals + contributions |
| `AiModule` | Co-pilot summaries / Q&A (Phase 6) |

### Frontend route map (aligned with design)

| Route | Screen |
|---|---|
| `/sign-in` | Sign In |
| `/create-account` | Create Account |
| `/reset-password` | Reset Password |
| `/` or `/dashboard` | Dashboard |
| `/transactions` | Transactions |
| `/categories` | Categories & Budgets |
| `/progress` | Financial Progress |
| `/goals` | Savings Goals |
| `/insights` | AI Insights |
| `/notifications` | Notifications |
| `/settings` | Settings & Household |

---

## 4. Data Model (Prisma / PostgreSQL)

Conceptual model from the PRD, made implementation-ready.

### 4.1 Entity relationship (MVP)

```text
User ──< HouseholdMember >── Household
Household ──< HouseholdInvite
Household ──< Category ──< Budget
Household ──< Transaction >── Category
Household ──< SavingsGoal ──< SavingsContribution >── User
Household ──< Notification
User ──< PasswordResetToken
```

### 4.2 Enums

```prisma
enum TransactionType {
  INCOME
  EXPENSE
}

enum PartnerSlot {
  PARTNER_1
  PARTNER_2
}

enum HouseholdMemberRole {
  OWNER
  MEMBER
}

enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

enum SavingsGoalStatus {
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum NotificationType {
  BUDGET_THRESHOLD
  SPENDING_INCREASE
  GOAL_MILESTONE
  PARTNER_ACTIVITY
  SYSTEM
}
```

### 4.3 Prisma schema sketch

```prisma
model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships          HouseholdMember[]
  createdTransactions  Transaction[]      @relation("CreatedBy")
  paidTransactions     Transaction[]      @relation("PaidBy")
  contributions        SavingsContribution[]
  passwordResetTokens  PasswordResetToken[]
  notifications        Notification[]
}

model Household {
  id                 String   @id @default(cuid())
  name               String
  defaultCurrency    String   @default("ARS")
  /// Partner 1 share as percent, e.g. 50 means 50/50
  defaultSplitPartner1Percent Int @default(50)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  members        HouseholdMember[]
  invites        HouseholdInvite[]
  categories     Category[]
  budgets        Budget[]
  transactions   Transaction[]
  savingsGoals   SavingsGoal[]
  notifications  Notification[]
}

model HouseholdMember {
  id          String              @id @default(cuid())
  householdId String
  userId      String
  role        HouseholdMemberRole @default(MEMBER)
  partnerSlot PartnerSlot
  displayName String?
  /// Hex or token for partner chip color
  displayColor String?
  joinedAt    DateTime            @default(now())

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([householdId, userId])
  @@unique([householdId, partnerSlot])
  @@index([userId])
}

model HouseholdInvite {
  id          String       @id @default(cuid())
  householdId String
  email       String
  token       String       @unique
  status      InviteStatus @default(PENDING)
  invitedById String
  expiresAt   DateTime
  createdAt   DateTime     @default(now())

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

  @@index([email, status])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Category {
  id          String          @id @default(cuid())
  householdId String
  name        String
  description String?
  icon        String?
  color       String?
  type        TransactionType
  isDefault   Boolean         @default(false)
  isActive    Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  household    Household     @relation(fields: [householdId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  budgets      Budget[]

  @@index([householdId, type, isActive])
}

model Budget {
  id              String   @id @default(cuid())
  householdId     String
  categoryId      String
  amount          Decimal  @db.Decimal(14, 2)
  currency        String   @default("ARS")
  month           Int      // 1-12
  year            Int
  /// Optional Partner 1 percent for this envelope; null = use household default
  splitPartner1Percent Int?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
  category  Category  @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  @@unique([householdId, categoryId, month, year])
  @@index([householdId, year, month])
}

model Transaction {
  id              String          @id @default(cuid())
  householdId     String
  categoryId      String
  createdById     String
  paidById        String?
  description     String
  amount          Decimal         @db.Decimal(14, 2)
  currency        String          @default("ARS")
  type            TransactionType
  paymentMethod   String?
  notes           String?
  transactionDate DateTime        @db.Date
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
  category  Category  @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  createdBy User      @relation("CreatedBy", fields: [createdById], references: [id])
  paidBy    User?     @relation("PaidBy", fields: [paidById], references: [id])

  @@index([householdId, transactionDate])
  @@index([householdId, type, transactionDate])
  @@index([householdId, categoryId, transactionDate])
  @@index([householdId, paidById, transactionDate])
}

model SavingsGoal {
  id                   String            @id @default(cuid())
  householdId          String
  name                 String
  description          String?
  targetAmount         Decimal           @db.Decimal(14, 2)
  /// Derived from contributions in application logic; may also be cached
  currentAmount        Decimal           @default(0) @db.Decimal(14, 2)
  currency             String            @default("ARS")
  targetDate           DateTime?         @db.Date
  status               SavingsGoalStatus @default(ACTIVE)
  splitPartner1Percent Int?
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt

  household     Household             @relation(fields: [householdId], references: [id], onDelete: Cascade)
  contributions SavingsContribution[]

  @@index([householdId, status])
}

model SavingsContribution {
  id               String   @id @default(cuid())
  savingsGoalId    String
  userId           String
  amount           Decimal  @db.Decimal(14, 2)
  contributionDate DateTime @db.Date
  notes            String?
  createdAt        DateTime @default(now())

  savingsGoal SavingsGoal @relation(fields: [savingsGoalId], references: [id], onDelete: Cascade)
  user        User        @relation(fields: [userId], references: [id])

  @@index([savingsGoalId, contributionDate])
}

model Notification {
  id          String           @id @default(cuid())
  householdId String
  userId      String?          // null = visible to whole household
  type        NotificationType
  title       String
  description String
  /// Optional links: categoryId, budgetId, transactionId, goalId
  metadata    Json?
  isRead      Boolean          @default(false)
  dedupeKey   String?          // prevent duplicate alerts for same event
  createdAt   DateTime         @default(now())

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
  user      User?     @relation(fields: [userId], references: [id])

  @@unique([householdId, dedupeKey])
  @@index([householdId, isRead, createdAt])
}
```

### 4.4 Calculation notes (must match business rules)

| Metric | Formula |
|---|---|
| Net Cash Flow Buffer | `Σ income − Σ expenses` |
| Available Balance (after savings) | `Σ income − Σ expenses − Σ savings contributions` |
| Savings rate | `(income − expenses) / income × 100` (unavailable if income = 0) |
| Budget utilization | `category expenses / budget × 100` |
| Budget status | &lt;80% within, 80–99.99% approaching, ≥100% exceeded |
| Goal progress | `currentSaved / target × 100` |

Period aggregates use **`transactionDate`**, not `createdAt`.

---

## 5. How this maps to Linear

Use each **Phase** below as a **Linear Milestone**.

Use each **Issue** as a Linear issue.

### Suggested Linear labels

- `phase-0` … `phase-6`
- `frontend` / `backend` / `fullstack`
- `auth` / `data-model` / `api` / `ui` / `ai`
- `blocked` / `spike`

### Issue ID convention (for docs → Linear)

`P{phase}-{nnn}` e.g. `P0-001`, `P2-014`

When creating issues in Linear, put the ID in the title prefix:  
`[P1-003] Implement household invite accept flow`

### Milestone Definition of Done (every phase)

- Backend endpoints covered by basic tests or manual API checklist
- UI matches design intent for that phase (light theme, partner chips where relevant)
- Household isolation enforced server-side
- Calculations match `BUSINESS_RULES.md`
- No floating-point money math

---

## 6. Phases & Issues

---

### Milestone P0 — Project Foundation

**Goal:** Runnable apps, DB, CI basics, design tokens wired.

| ID | Issue | Area | Notes |
|---|---|---|---|
| P0-001 | Scaffold NestJS API with Prisma + PostgreSQL | backend | Env config, health check |
| P0-002 | Define Prisma schema (MVP models + enums) | backend | From §4 |
| P0-003 | Initial migration + seed defaults (expense/income categories template) | backend | |
| P0-004 | Scaffold React app with Tailwind + shadcn | frontend | |
| P0-005 | Add TanStack Query + API client + auth token storage | frontend | |
| P0-006 | Port design tokens (colors, typography) from DESIGN.md | frontend | Hanken Grotesk + Inter |
| P0-007 | App shell: sidebar, header chrome, empty authenticated layout | frontend | Match design nav |
| P0-008 | Shared Zod DTOs / validation strategy | fullstack | Align FE/BE |
| P0-009 | Decide FE hosting model (Vite SPA vs Next) + document | spike | Prefer one choice |
| P0-010 | Local docker-compose for PostgreSQL | backend | |

**Exit criteria:** `web` talks to `api` health endpoint; schema migrated; design shell renders.

---

### Milestone P1 — Auth & Household (Shared Space)

**Goal:** Two users can register, form a household, and invite a partner.

| ID | Issue | Area | Notes |
|---|---|---|---|
| P1-001 | User register (email/password) API | backend | Hash passwords (argon2/bcrypt) |
| P1-002 | Login + JWT access/refresh + logout | backend | |
| P1-003 | Password reset request + confirm | backend | Email can be stubbed/logged in MVP |
| P1-004 | Auth guards + current-user decorator | backend | |
| P1-005 | Create household + first member as OWNER / PARTNER_1 | backend | |
| P1-006 | Partner invite create/accept/revoke | backend | |
| P1-007 | Get household members + default split | backend | |
| P1-008 | Update profile + household settings (name, default split, currency) | backend | |
| P1-009 | Sign In screen | frontend | Design: `sign_in_tandem_finance` |
| P1-010 | Create Account screen (+ optional invite email) | frontend | Design: `create_account_tandem_finance` |
| P1-011 | Reset Password screen | frontend | Design: `reset_password_tandem_finance` |
| P1-012 | Auth route guards + session bootstrap | frontend | |
| P1-013 | Settings & Household page (basic) | frontend | Profile, invite, split |
| P1-014 | Sidebar household members + 50/50 indicator | frontend | |

**Exit criteria:** Couple can create Shared Space, both can sign in, isolation by household works.

---

### Milestone P2 — Transactions & Categories

**Goal:** Core money tracking with partner attribution.

| ID | Issue | Area | Notes |
|---|---|---|---|
| P2-001 | Seed default categories on household create | backend | |
| P2-002 | Categories CRUD + deactivate (no hard delete if used) | backend | |
| P2-003 | Transactions CRUD with type/category/date validation | backend | amount > 0 |
| P2-004 | Transaction filters (type, category, paidBy, date range, search) | backend | |
| P2-005 | Period summary endpoint (income, expenses, net cash flow buffer) | backend | |
| P2-006 | Partner-scoped summary/filter query params | backend | All Shared / Partner |
| P2-007 | Categories list UI (basic, before budgets polish) | frontend | |
| P2-008 | Transactions list + search/filters | frontend | Design list patterns |
| P2-009 | Add/Edit Transaction modal (Expense \| Income, Who paid) | frontend | Design: `transactions_add_expense_modal` |
| P2-010 | Global **New Expense** CTA + ⌘K shortcut | frontend | |
| P2-011 | Partner attribution chips | frontend | |
| P2-012 | Partner filter + month picker in chrome | frontend | |
| P2-013 | Dashboard v1 KPIs from summary API | frontend | Design: `main_dashboard` KPIs |
| P2-014 | Enforce category type matches transaction type | fullstack | Business rule |

**Exit criteria:** Partners can log income/expenses, filter by person/month, see correct totals.

---

### Milestone P3 — Budgets, Dashboard Charts & Financial Progress

**Goal:** Envelopes with utilization + progress comparisons.

| ID | Issue | Area | Notes |
|---|---|---|---|
| P3-001 | Budgets upsert per category/month/year | backend | |
| P3-002 | Budget utilization endpoint (spent, remaining, %) | backend | Status bands 80/100 |
| P3-003 | Dashboard charts data (cash flow trajectory, by category) | backend | |
| P3-004 | Financial Progress comparison endpoint (MoM / 3 / 6) | backend | Equivalent-period rule |
| P3-005 | Categories & Budgets screen (Joint Envelopes UI) | frontend | Design: `categories_monthly_budgets` |
| P3-006 | Envelope edit drawer (threshold + optional split %) | frontend | |
| P3-007 | Budget status colors (green/amber/rose) | frontend | |
| P3-008 | Dashboard charts + recent activity | frontend | |
| P3-009 | Financial Progress screen | frontend | Design: `financial_progress_comparison` |
| P3-010 | Export CSV for progress (optional stretch) | fullstack | Can defer |

**Exit criteria:** Users set budgets, see utilization, compare months accurately.

---

### Milestone P4 — Notifications & Alerts

**Goal:** Proactive alerts without spam.

| ID | Issue | Area | Notes |
|---|---|---|---|
| P4-001 | Notification model + list/mark-read APIs | backend | |
| P4-002 | Budget threshold alert generator (80%, 90%, 100%+) | backend | Use `dedupeKey` |
| P4-003 | Spending increase alert generator | backend | Significant MoM change |
| P4-004 | Notification evaluation job/hook after transaction/budget changes | backend | Sync or queue |
| P4-005 | Notifications center UI + filters | frontend | Design: `notifications_financial_alerts_center` |
| P4-006 | Header unread badge + mark all as read | frontend | |
| P4-007 | Alert preferences (basic on/off) | fullstack | Can be minimal |
| P4-008 | Deep-link notification → category/budget/transaction | frontend | |

**Exit criteria:** Real alerts appear for budget thresholds and spending increases; no duplicate spam.

---

### Milestone P5 — Savings Goals

**Goal:** Shared goals with contributions that are not ordinary expenses.

| ID | Issue | Area | Notes |
|---|---|---|---|
| P5-001 | Savings goals CRUD | backend | |
| P5-002 | Contributions CRUD + recompute `currentAmount` | backend | |
| P5-003 | Available balance after savings in summary API | backend | Business rule |
| P5-004 | Goal milestone notifications | backend | |
| P5-005 | Savings Goals list + progress UI | frontend | Design: `savings_goals_milestones` |
| P5-006 | Create New Goal modal | frontend | Design: `savings_goals_create_new_goal_modal` |
| P5-007 | Add contribution flow | frontend | |
| P5-008 | Dashboard Savings & Investing KPI wiring | frontend | |

**Exit criteria:** Goals track progress; contributions affect available-after-savings, not expense totals.

---

### Milestone P6 — AI Insights (Tandem Co-pilot)

**Goal:** Useful recommendations only after financial math is trustworthy.

| ID | Issue | Area | Notes |
|---|---|---|---|
| P6-001 | Household finance context assembler (period aggregates + top categories) | backend | |
| P6-002 | Monthly summary generation endpoint | backend | |
| P6-003 | Conversational Q&A endpoint (scoped to household data) | backend | Provider TBD |
| P6-004 | Spending analysis + savings suggestion prompts | backend | No auto-writes |
| P6-005 | AI Insights page + Co-pilot chat UI | frontend | Design: `ai_financial_insights` |
| P6-006 | Dashboard AI nudge banner | frontend | Suggestions only |
| P6-007 | Safety: refuse invented numbers; log prompts without leaking cross-household data | backend | |
| P6-008 | Feature flag AI for staged rollout | fullstack | |

**Exit criteria:** Co-pilot answers from real data; cannot mutate transactions/budgets/goals.

---

## 7. Cross-cutting work (create as ongoing Linear issues/labels)

| ID | Issue | When |
|---|---|---|
| X-001 | Household authorization middleware on every domain route | From P1 onward |
| X-002 | Consistent money formatting (ARS locale, tabular nums) | From P2 |
| X-003 | Empty / loading / error states for all screens | Each UI phase |
| X-004 | Mobile responsive pass for shell + primary flows | After P2 |
| X-005 | E2E happy path: register → invite → add expense → budget → alert | After P4 |
| X-006 | Security review: JWT storage, CORS, rate limits on auth | Before “MVP done” |
| X-007 | OpenAPI / API docs for frontend contract | Optional from P1 |

---

## 8. Post-MVP (do not put in MVP milestones)

Keep as a separate Linear project or backlog label `post-mvp`:

- Bank sync / imports
- Receipt uploads & Instant Receipt Drop
- Per-transaction settlement ledgers
- Partner approval workflows
- Recurring transactions + payment reminders
- Multi-currency conversion
- Passkeys / SSO
- Savings autopilot, round-ups, APY vaults
- Advanced AI What-If / Autopilot money movement
- PDF reports

---

## 9. Suggested Linear creation order

1. Create project **Tandem Finance MVP**
2. Create milestones **P0 … P6** with descriptions from §6
3. Create labels listed in §5
4. Create issues from tables (title = `[ID] Title`, description = Notes + acceptance from phase exit criteria)
5. Set milestone + labels per issue
6. Order issues inside each milestone by dependency (backend before dependent frontend when blocked)

### Example Linear issue body template

```md
## Context
Phase: P2 — Transactions & Categories
Refs: PRODUCT_OVERVIEW §3.3, BUSINESS_RULES §2, design/transactions_add_expense_modal

## Scope
- …

## Acceptance criteria
- [ ] …
- [ ] Matches business rules for amount > 0 and category type compatibility
- [ ] Household isolation enforced

## Out of scope
- …
```

---

## 10. MVP “done” checklist

- [ ] P0–P5 complete (P6 can ship shortly after if data quality is proven)
- [ ] Two real users can run a month of household finances
- [ ] Dashboard KPIs match SQL aggregates
- [ ] Budgets alert at 80 / 90 / 100+
- [ ] Savings contributions excluded from ordinary expenses
- [ ] Design navigation and primary screens implemented
- [ ] No bank/vault/autopilot claims in production UI unless implemented

---

## 11. Open decisions (resolve in P0)

1. **React SPA (Vite) vs Next.js** — SPA is enough for MVP; Next helps if SSR/SEO matters later.
2. **Email provider** for invites/password reset (Resend, SES, or console stub).
3. **AI provider** for Phase 6 (OpenAI / Anthropic / local) and cost limits.
4. **Monorepo tool** (pnpm workspaces / Turborepo) vs two repos.
5. **Refresh token storage** (httpOnly cookie vs memory + refresh rotation).

Document decisions in this file when chosen.

**Status (PO review, 2026-11-14):**

1. ✅ **Resolved**: React SPA on Vite (Decision #1).
2. ✅ **Resolved for dev** (console stub). ⏸ The production vendor (Resend vs SES) is **deferred** to a pre-production PO decision (Decision #2).
3. ⏸ **Deferred to P6**: AI provider and cost limits (Decision #3).
4. ✅ **Resolved**: pnpm workspaces in a single repo (Decision #4).
5. ✅ **Resolved in P1 (2026-11-14)**: httpOnly refresh cookie with rotation (Decision #5). Password hashing: argon2id (Decision #8).

### Decisions (resolved in P0 — 2026-11-14, PO)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | FE hosting model (P0-009) | **React SPA on Vite** | No SSR/SEO need for an authenticated household app; simpler deploy (static + API). Revisit only if public marketing pages need SSR. |
| 2 | Email provider | **Console stub for MVP dev** (`MailService` logs links); pick Resend/SES before production | Unblocks P1 invites/reset without vendor lock-in. |
| 3 | AI provider | **Deferred to P6 PO decision** | Not needed until P6. |
| 4 | Monorepo tool | **pnpm workspaces** (`apps/api`, `apps/web`, `packages/shared`); no Turborepo for now | Minimal tooling; add Turbo later if build times warrant. |
| 5 | Refresh token storage | **Deferred to P1 PO decision.** P0 FE ships a swappable token-storage module (in-memory access token) | Decided alongside auth implementation. |
| 6 | Shared validation (P0-008) | **Zod schemas in `@tandem/shared`**; API validates with a Zod pipe, FE uses the same schemas with React Hook Form | One source of truth for DTOs. Money travels as **decimal strings** (e.g. `"1234.50"`), never JS numbers. |

Local ports: API `http://localhost:3001` (prefix `/api`), web `http://localhost:5173` (Vite proxies `/api` → 3001), PostgreSQL `localhost:5433` via `docker-compose.yml`.

**PO review of the table above (2026-11-14):**

- **#1 Vite SPA: confirmed.** All routes in §3 are behind auth, so SSR adds nothing. Vite is already scaffolded (`apps/web`).
- **#2 Console email stub: confirmed, with an amendment.** P0 has no code for this. `MailService` (console transport) is **built in P1**, with a transport interface so that a later switch to Resend or SES only changes config. Choosing the production vendor is a pre-production gate, not a P1 blocker.
- **#3 AI provider deferred to P6: confirmed.** Cost limits are decided in the same P6 session. Until then, nothing in P0–P5 may depend on an LLM.
- **#4 pnpm workspaces: confirmed.** It matches the repo (`pnpm-workspace.yaml`: `apps/*`, `packages/*`). It is one repo, not two.
- **#5 Refresh token storage deferred to P1: confirmed.** The P0 in-memory `TokenStorage` (`apps/web/src/lib/auth/token-storage.ts`) can be swapped out and never uses localStorage. **PO leaning for P1:** an httpOnly, Secure, SameSite=Lax refresh cookie with rotation, plus the access token held in memory. This fits the same-origin `/api` proxy. P1 still makes the final call.
- **#6 Zod in `@tandem/shared`, money as decimal strings: confirmed, with an amendment.** The money string format is `^(0|[1-9]\d{0,11})(\.\d{1,2})?$`, at most 2 decimals, so it fits `NUMERIC(14,2)` / `Decimal(14,2)`. The API returns money as strings on output too, never as JSON numbers. Currency defaults to `ARS`.
- **Ports: confirmed.** API 3001 (3000 is often taken), web 5173 (`strictPort`), PostgreSQL on host port 5433, to avoid clashing with a local PG on 5432.
- **Added #7: CI is deferred.** The P0 goal says "CI basics", but no P0 issue covers it and the exit criteria don't need it. The repo has no CI and is not under git yet. **Follow-up for P1:** run `git init` and add a minimal CI workflow (`pnpm install`, `build`, `test`).

### Decisions (resolved in P1 — 2026-11-14, PO)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 5 | Refresh token storage (**supersedes the P0 deferral**) | **httpOnly refresh cookie with rotation.** Cookie `tandem_rt`, `Path=/api/auth`, `HttpOnly`, `Secure` in production, `SameSite` set by env (`Lax` locally, where Vite proxies `/api` same-origin; `None` + `Secure` in production, because Cloudflare Pages and Cloud Run are cross-site). Refresh tokens are opaque random values, stored **hashed (sha256)** in a new `RefreshToken` table and **rotated on every refresh**. Reusing a rotated token **revokes the whole token family**. CORS allows credentials only for `CORS_ORIGIN`. CSRF: `/auth/refresh` and `/auth/logout` require the header `X-Requested-With: tandem` (forces a preflight). Access JWT ~15 min, sent as `Authorization: Bearer`, held **in memory** on the web (never localStorage). Refresh lifetime ~30 days | Keeps the refresh token out of JS (XSS), survives reloads, and detects stolen tokens through rotation and reuse detection. The header check plus strict CORS covers CSRF for the cross-site production setup. |
| 8 | Password hashing | **argon2id** (`argon2` npm package) | Memory-hard, current OWASP recommendation. |

Approved dependencies for P1: API `@nestjs/jwt`, `@nestjs/throttler`, `cookie-parser`, `argon2`; web `react-hook-form`, `@hookform/resolvers`. No Passport.

P0 follow-ups are in P1 scope: the console `MailService` (#2 amendment), git + minimal CI (#7), and the category unique-active-name rule.
