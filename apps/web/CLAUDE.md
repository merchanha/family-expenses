# apps/web — Frontend Instructions

Read the root `CLAUDE.md` first. It defines the product, the business rules, the API contract, the auth model and the workflow. This file adds frontend-specific rules. Use the same feature names and terms as the root file.

The web app **presents** financial data and **collects** input. It does **not** own authoritative calculations: totals, balances, savings rate, utilization, variations and goal progress all come from the API.

---

## 1. Stack

| Concern | Choice |
|---|---|
| Build | Vite 8, React 19, TypeScript strict (`tsc -b`) |
| Routing | React Router 7 (`src/app/routes.tsx`, `createBrowserRouter` style objects) |
| Server state | TanStack Query 5 (`src/lib/query-client.ts`) |
| Forms | React Hook Form + `@hookform/resolvers/zod` with schemas from `@tandem/shared` (install with the first form in P1) |
| Styling | Tailwind CSS v4 (CSS-first tokens in `src/styles/globals.css`, no `tailwind.config`) + shadcn/ui (`components.json`, new-york) |
| Icons | lucide-react |
| Charts | Recharts (install in P3 with the first chart) |
| Tests | Vitest + React Testing Library + jsdom 26 (jsdom 31 crashes on Node 22.13) |
| Deploy | Static SPA on Cloudflare Pages (SPA fallback to `index.html`) |

Env: `VITE_API_URL` (default `/api`). In development, Vite proxies `/api` to `VITE_API_PROXY_TARGET` (default `http://localhost:3001`). **Every `VITE_*` variable ships to the browser, so never put secrets in them.**

---

## 2. Folder structure

### Current state (P0)

```text
src/
├── main.tsx
├── app/                 # app.tsx, providers.tsx, routes.tsx, nav.ts (NAV_ITEMS)
├── components/
│   ├── ui/              # shadcn primitives (button, card, badge, sheet, tooltip, …)
│   ├── layout/          # AppLayout, PublicLayout, Sidebar, SidebarNav, AppHeader, Brand
│   └── api-status.tsx
├── hooks/use-health.ts
├── lib/
│   ├── api.ts           # apiRequest / api.get|post|patch|put|delete, ApiError
│   ├── auth/token-storage.ts
│   ├── money.ts         # formatMoney(decimalString)
│   ├── query-client.ts
│   └── utils.ts         # cn()
├── pages/               # P0 placeholders, replaced by feature pages as features land
├── styles/globals.css   # design tokens
└── test/                # setup.ts, render.tsx helpers
```

### Target: feature-based (from P1 on)

New product code goes in `src/features/<feature>/`. Feature names match the root file: `auth`, `households`, `categories`, `transactions`, `budgets`, `dashboard`, `financial-progress`, `savings`, `notifications`, `ai-insights`.

```text
src/features/transactions/
├── domain/
│   ├── types.ts                      # re-exports/derives types from @tandem/shared; UI-only types
│   └── transaction-display.ts        # pure display rules (sign by type, partner chip label)
├── application/
│   ├── transaction-keys.ts           # query key factory
│   ├── use-transactions.ts           # useQuery wrapper
│   ├── use-create-transaction.ts     # useMutation + invalidation
│   └── use-transaction-filters.ts    # URL search-param state (month, partner, category)
├── infrastructure/
│   └── transactions-api.ts           # fetch functions using lib/api + response schema parsing
├── presentation/
│   ├── components/
│   │   ├── transaction-list.tsx
│   │   ├── transaction-row.tsx
│   │   └── transaction-form-dialog.tsx
│   └── pages/
│       └── transactions-page.tsx
└── index.ts                          # public API: pages + hooks other features may use
```

**Where shared code lives:**

| Folder | What goes there |
|---|---|
| `src/components/ui` | shadcn primitives only |
| `src/components/layout` | app chrome |
| `src/components/` (other) | generic composites used by 2+ features (e.g. `money-amount.tsx`, `partner-chip.tsx`, `empty-state.tsx`) |
| `src/lib` | framework-level helpers (API client, auth session, money formatting, query client) |
| `src/app` | composition: providers, router, nav |

---

## 3. Layers

| Layer | Belongs here | Does not belong here |
|---|---|---|
| **domain** | Types (inferred from `@tandem/shared` schemas), UI-facing enums and labels, pure display rules | fetch calls, React, **authoritative money math** |
| **application** | Custom hooks wrapping TanStack Query, query keys, invalidation, URL/filter state, orchestration across calls | JSX, direct `fetch` |
| **infrastructure** | One file per API resource: functions calling `api.*` with the shared response schema | React hooks, UI state |
| **presentation** | Pages (route-level, compose hooks + components), components (render + user interaction) | `fetch`, query keys, business calculations |

Rules:

- **Imports between features** go through `features/<x>/index.ts` only. No deep imports into another feature's folders, and no circular feature dependencies.
- **Layers are optional.** A feature with no domain rules has no `domain/` folder, and you don't create empty folders.
- **No Redux and no global stores**, unless there is a demonstrated need that Query, the URL and context can't cover. Ask first.

---

## 4. Components

- **Function components** with typed props (`interface TransactionRowProps`). Use named exports, not default exports.
- **Pages** fetch through hooks and pass data down. **Components** receive data and callbacks. Keep components small and focused, and split them when they handle more than one concern.
- **Don't over-generalise.** Build the component the feature needs; extract it to `src/components` only when a second feature needs it.
- **shadcn primitives** in `components/ui` may be restyled to match DESIGN.md tokens. Do not fork them per feature.
- **No inline data fetching** or `useEffect`-driven fetching. Use TanStack Query.

## 5. Hooks

- Files are named `use-<thing>.ts` and export `use<Thing>`. Each hook does one job.
- **Query hooks** return the TanStack result object (or a light projection of it), not new ad-hoc loading flags.
- **Mutation hooks** own their invalidation and any success toast. Components only call `mutate` / `mutateAsync`.
- Pure helpers don't need to be hooks.

## 6. TanStack Query

- **Query keys:** each feature has a key factory, for example `transactionKeys = { all: ['transactions'], list: (f) => [...all, 'list', f], detail: (id) => [...all, 'detail', id] }`. Filters (year, month, partner) go into the key.
- **Invalidation:** money changes affect server-computed aggregates, so a mutation must invalidate everything it affects. Creating, editing or deleting a transaction invalidates `transactions`, `summaries` (dashboard), `budgets` and `financial-progress`, plus `notifications` when the server may raise alerts. A savings contribution invalidates `savings` and `summaries`.
- **Optimistic updates:** do **not** use them for amounts or totals; wait for the server. They are fine for trivial toggles such as marking a notification read.
- **Defaults:** live in `createQueryClient()` (no retry on 4xx). Don't override them per query without a reason.
- **Auth state:** never store the auth token or user identity in the Query cache. Session state belongs to the auth module (§12).

## 7. Local state

- **Component state:** `useState` / `useReducer` for UI-only state such as open dialogs and tabs.
- **URL search params** for shareable view state, such as the selected month (`?month=2026-11`), the partner filter (`?partner=PARTNER_1`) and category filters. Refresh and back/forward must keep the view.
- **React context** only for app-wide session or UI concerns (the auth session, the global partner filter if the URL doesn't fit). Don't use it as a data cache.

## 8. API communication

- All HTTP goes through `src/lib/api.ts` (`api.get/post/patch/put/delete`, `apiRequest`). Never call `fetch` directly in features.
- **Response validation:** pass the shared Zod response schema (`schema` option), so contract drift fails loudly as `ApiError` with code `INVALID_RESPONSE`.
- **Paths are relative to `API_BASE_URL`** (`/transactions`, not `/api/transactions`). Query params go in the `query` option.
- **The household is implicit.** Never send `householdId` or `userId` to identify the household; the API derives them from the token.

## 9. Contract types

- **Types come from `@tandem/shared`:** `z.infer` of the shared schemas (for example `CreateTransactionInput` and the response types). Don't hand-write a second version of an API shape.
- **Missing schemas:** if a needed schema doesn't exist, add it to `@tandem/shared` (coordinate with BE) and rebuild it (`pnpm --filter @tandem/shared build`).
- **UI-only types** live in the feature's `domain/types.ts`: view models, chip variants and so on.
- **Value formats:** money and percentages are **strings** (`"1234.50"`, `"82.50"` or `null`). Dates are `YYYY-MM-DD` strings; parse them for display only, and treat them as calendar dates, not instants.

## 10. Forms (React Hook Form + Zod)

- `useForm({ resolver: zodResolver(createTransactionSchema) })`, using the **same schema** the API validates with.
- Form-only fields (for example "confirm password") extend the shared schema locally with `.extend` / `.refine`.
- **Money inputs** keep the value as a string, validated with `positiveMoneyStringSchema`. Normalise the locale input (`1.234,50` → `1234.50`) before validation. **Never** convert to `number`.
- **Server validation errors** (`400` with `issues[]`) are mapped onto fields with `setError(path, …)`. `409` and `422` messages are shown inline or as a form-level alert.
- **Submit states:** disable the submit button while pending and prevent double submission.

## 11. Tailwind CSS and shadcn/ui

- **Tokens:** use the design tokens in `src/styles/globals.css`, ported from `design/tandem_finance/DESIGN.md`. **No hard-coded hex colors** in components.
  - Surfaces: `bg-surface`, `bg-surface-container-*`. Text: `text-on-surface`, `text-on-surface-variant`.
  - States: `text-positive`, `text-negative`, `text-warning`. Partners: `bg-partner-1`, `bg-partner-2`, plus `*-container` and `*-border`.
  - Shadows: `shadow-level-1..3`.
- **Typography:** use the scale utilities (`text-display-lg`, `text-headline-*`, `text-body-*`, `text-label-*`). Headings use Hanken Grotesk (`font-headline`) and body text uses Inter (`font-body`). Numbers use `tabular` (tnum).
- **Light theme first**, matching the design.
- **Class names:** combine them with `cn()`. Use `class-variance-authority` for component variants, the same as shadcn.
- **Adding shadcn components:** `pnpm dlx shadcn@latest add <component>` from `apps/web`, then check for the `import { cn } from "cn"` bug (see root quirks).
- **Design source:** each screen's reference is `design/<screen>/screen.png` + `code.html`. Match the intent, not pixel-perfect HTML. **Never** build out-of-scope mockup features (bank sync, vaults, APY, autopilot, settlements).

## 12. Authentication and protected routes

- **Auth model:** our own JWT from the API (not Supabase).
  - The access token is held **in memory** through `src/lib/auth/token-storage.ts` (swap it with `setTokenStorage`).
  - Refresh handling follows the P1 decision (likely an httpOnly refresh cookie with rotation, in which case JS never sees the refresh token).
  - Never put tokens in `localStorage` unless that decision explicitly says so.
- **Session bootstrap:** on app start, try a silent refresh, then load `GET /households/me` to get the current user, household and partner slot.
- **Route guards:**
  - A `RequireAuth` route wrapper protects `AppLayout` routes and redirects to `/sign-in?redirect=…`.
  - Public routes (`/sign-in`, `/create-account`, `/reset-password`) redirect signed-in users to `/dashboard`.
  - A user without a household goes to onboarding (create or join a Shared Space).
- **401 handling:** on `401`, `apiRequest` attempts one refresh and retries once. If that fails, clear the session and the Query cache (`queryClient.clear()`) and redirect to sign-in.
- **Not a security boundary:** the UI may hide actions, but authorization is the API's job. Never rely on hidden buttons for it.

## 13. Presenting financial data

- **Money:** format with `formatMoney(decimalString, { currency?, locale? })` from `src/lib/money.ts` (es-AR, ARS by default). It throws on non-decimal input, so never pass it a number. Use one shared `MoneyAmount` component for sign and color: income is `text-positive`, expense is `text-negative`, and numbers are tabular.
- **Server values only.** Display totals, balances, savings rate, utilization, variation and goal progress exactly as the API returns them. **Do not recompute** them in components or hooks.
  - A live form preview (for example "remaining after this expense") is allowed only if it's clearly a preview. It must be computed with string or decimal-safe helpers, never floats, and must never be shown as the real value.
- **`null` percentages:** show "Not available" or "—". Never show `0%`, `NaN` or `Infinity`.
- **Budget status:**
  - Shown with **text plus color**: "Within budget", "Approaching (80%+)", "Exceeded".
  - The band comes from the API.
  - Spending increases (Financial Progress) are labelled separately from budget overruns.
- **Partner attribution:** "Created by" and "Paid by" chips use the partner tokens. The partner filter shows **All Shared | Partner 1 | Partner 2** with real member display names once P1 lands.
- **Dates:** show calendar dates in the household locale (es-AR by default). Month navigation defaults to the current month.
- **Charts (Recharts, P3):** they render series the API already computed. Format axes and tooltips with `formatMoney`, and never aggregate raw transactions in the client.

## 14. Naming

| Thing | Convention | Example |
|---|---|---|
| Component file / export | kebab-case file, PascalCase named export | `transaction-row.tsx` → `TransactionRow` |
| Page | `<feature>-page.tsx` | `transactions-page.tsx` → `TransactionsPage` |
| Hook | `use-<thing>.ts` | `use-create-transaction.ts` |
| API module | `<resource>-api.ts` | `transactions-api.ts` (`listTransactions`, `createTransaction`) |
| Query keys | `<feature>-keys.ts` | `transactionKeys` |
| Tests | beside the file, `*.test.ts(x)` | `transaction-row.test.tsx` |
| Routes | kebab-case, matching the root table | `/transactions`, `/progress`, `/goals` |

## 15. Errors

- **`ApiError` carries `status`, `code` and `body`.** Branch on `status` (401, 404, 409, 422) and never on message text.
- **Query errors:** show an inline error state with a retry button that calls `refetch`. Use a route-level error boundary for unexpected render errors.
- **Mutation errors:** show them inline in the form or dialog, or as a toast for background actions. Messages must be human-readable; never show raw JSON or stack traces.
- **Network failures** (`status 0`): show "Can't reach Tandem right now".

## 16. Loading and empty states

- **Loading:** use `Skeleton` placeholders shaped like the content on the first load. On refetch, keep the old data visible (`placeholderData: keepPreviousData` for filter or month changes). No full-page spinners after the first load.
- **Empty states:** every list and chart has a friendly one with a primary action, for example "No expenses this month — Add expense". Distinguish "no data yet" from "no results for these filters".

## 17. Accessibility and responsive design

- **Semantics:** use semantic HTML and Radix/shadcn primitives for dialogs, menus and sheets; they bring focus management and ARIA.
- **Controls:** every control has an accessible name, and icon-only buttons have `aria-label`. Form fields have labels and `aria-describedby` errors.
- **Color is never the only signal** for income/expense, budget status or partners; add text or an icon. Meet WCAG AA contrast with the tokens.
- **Keyboard:** everything is reachable and visible focus rings are kept. The global "New Expense" shortcut (⌘K / Ctrl+K, P2) must not trap focus.
- **Responsive:**
  - Mobile-first. The sidebar becomes a `Sheet` below `lg`.
  - No horizontal page scroll at 360px.
  - Tables become stacked rows or cards on small screens.
  - Touch targets are at least 40px.

## 18. Testing (Vitest + React Testing Library)

- **Run:** `pnpm --filter @tandem/web test` (or `test:watch`). Setup is in `src/test/setup.ts`; use the `render` helper in `src/test/render.tsx`, which provides the Query client and router.
- **What to test:**
  - Components with behavior: forms (validation, submit, server errors), filters, and states (loading, empty, error).
  - Hooks, with a mocked `api` or mocked fetch.
  - Pure display helpers.
  - `formatMoney` and money input normalisation.
- **How to query:** by role, label or text, as a user would. Avoid `data-testid` unless nothing else works. Use `user-event` for interactions.
- **What not to do:** no snapshot-only tests, and no tests that only check implementation details or library behavior.
- **Mocks:** mock at the HTTP or `api` boundary. Responses must satisfy the shared Zod schemas, so tests catch contract drift.

---

## 19. Workflow and checks

Follow root §12 (inspect → plan → approval → implement → verify → report). Before calling frontend work done:

```bash
pnpm --filter @tandem/shared build     # if the contract changed
pnpm --filter @tandem/web typecheck
pnpm --filter @tandem/web test
pnpm --filter @tandem/web build
```

- **Lint:** ESLint isn't configured yet; propose it as its own change.
- **Visual check:** run `pnpm dev:web` (port 5173, with the API on 3001) and compare against `design/<screen>/screen.png`. Headless Chrome screenshots have a 500px minimum viewport. Stop only the dev servers you started, by exact PID.
- **New dependencies:** explain each one. Reuse shadcn primitives and the existing helpers before adding a library.
