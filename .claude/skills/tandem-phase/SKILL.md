---
name: tandem-phase
description: >-
  Starts a Claude Code agent-team session for one Tandem Expenses Linear
  milestone (P0–P6). Use when the user runs /tandem-phase with a phase like
  P0, P1, or 2, or asks to start a milestone with agent teams.
disable-model-invocation: true
argument-hint: P0|P1|P2|P3|P4|P5|P6
user-invocable: true
---

# Tandem phase agent team

Run **exactly one** Linear milestone for Tandem Expenses using Claude Code agent teams.

## 1. Resolve the phase argument

Argument: `$ARGUMENTS` (also available as `$0`).

Normalize to `P0`–`P6`:

| Input examples | Milestone |
|---|---|
| `P0`, `0`, `p0` | P0 — Project Foundation |
| `P1`, `1` | P1 — Auth & Household |
| `P2`, `2` | P2 — Transactions & Categories |
| `P3`, `3` | P3 — Budgets & Financial Progress |
| `P4`, `4` | P4 — Notifications & Alerts |
| `P5`, `5` | P5 — Savings Goals |
| `P6`, `6` | P6 — AI Insights |

If missing or invalid, ask for `P0`–`P6` and stop.

## 2. Project context (always)

- **Linear project:** Tandem Expenses (`P-FOR-2`)
- **Team:** Forge-henry (`FOR`)
- **Docs:** `docs/PRODUCT_OVERVIEW.md`, `docs/BUSINESS_RULES.md`, `docs/DEVELOPMENT_ROADMAP.md`, `docs/design/`
- **Stack:** React + shadcn/Tailwind + TanStack Query · NestJS + Prisma + PostgreSQL + JWT

Issue titles use prefixes: `[BE]`, `[FE]`, `[QA]`, `[PO]` plus roadmap ids like `[P2-003]`.

## 3. Execute this prompt (fill PHASE / MILESTONE_NAME)

Enable agent teams. Work ONLY Linear project "Tandem Expenses", milestone "**MILESTONE_NAME**".
Do NOT start any other milestone.

Assume earlier milestones are already done in this repo when PHASE is not P0.

Spawn teammates: BE (NestJS/Prisma), FE (React/shadcn/TanStack Query), QA, PO.
Each teammate claims only issues with their own prefix ([BE]/[FE]/[QA]/[PO]) AND this milestone.

Order:
1. PO resolves any open `[PO] [...-DEC]` decision issues for this milestone first
2. BE implements APIs first when FE is blocked on contracts
3. FE builds UI in parallel once unblocked (use design folders under `docs/design/`)
4. QA runs the milestone `[...-QA]` verification issue after BE/FE implementation issues are done
5. PO runs the milestone `[...-AC]` acceptance issue

Rules:
- Follow `docs/BUSINESS_RULES.md` and `docs/DEVELOPMENT_ROADMAP.md`
- Money uses Decimal/NUMERIC — never floating point
- Household isolation enforced server-side
- Do not implement post-MVP items (bank sync, APY vaults, autopilot, settlements)
- Update Linear issue status as work progresses when Linear MCP/tools are available
- Stop when this milestone exit criteria are met. Do not continue to the next P.

## 4. Milestone-specific notes

### P0 — Project Foundation
- PO first: Vite SPA vs Next (prefer Vite SPA unless SSR needed)
- Parallel: BE scaffold API/DB + FE scaffold app/shell/tokens
- Exit: web calls api `/health`; schema migrated; design shell renders

### P1 — Auth & Household
- PO: refresh token storage decision if open
- BE: register/login/JWT/household/invite + household auth guard
- FE: sign-in / create-account / reset-password / settings / sidebar members
- Exit: couple Shared Space works; cross-household isolation verified

### P2 — Transactions & Categories
- BE: categories + transactions + period summary + partner filters
- FE: transactions list/modal, New Expense ⌘K, partner chips, dashboard KPIs
- Exit: income/expense CRUD; filters; totals match business rules

### P3 — Budgets & Financial Progress
- BE: budgets, utilization bands (80/100), charts data, MoM comparisons (equivalent-period)
- FE: Joint Envelopes UI, charts, Financial Progress screen
- Exit: budgets + accurate comparisons

### P4 — Notifications & Alerts
- BE: notifications + 80/90/100+ alerts + dedupe + MoM increase alerts
- FE: notifications center + badge + deep links
- QA: also E2E register → expense → budget → alert when ready
- Exit: real alerts, no duplicate spam

### P5 — Savings Goals
- BE: goals + contributions; available-after-savings; not ordinary expenses
- FE: goals list/modal/contribution; dashboard savings KPI
- Exit: progress correct; contributions excluded from expenses
- No APY/vault/autopilot UI

### P6 — AI Insights
- PO first: AI provider + cost limits
- BE: context assembler, Q&A, safety (no invented numbers, no mutations)
- FE: AI Insights + dashboard nudge (suggestions only)
- Exit: grounded answers; feature flag; cannot mutate financial records

## 5. After finishing

Report:
1. Issues completed / still open for this milestone
2. What QA verified
3. Whether PO acceptance is done
4. Suggested next command: `/tandem-phase P{N+1}` (or stop after P6)
