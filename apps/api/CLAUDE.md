# apps/api — Backend Instructions

Read the root `CLAUDE.md` first. It defines the product, the business rules, the API contract, the auth model and the workflow. This file adds backend-specific rules. Use the same feature names and terms as the root file.

The API is the **single source of truth** for business rules, household authorization and every financial calculation.

---

## 1. Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 22, TypeScript strict |
| Framework | NestJS 10 (Express) — modular monolith |
| Persistence | Prisma 5 + PostgreSQL 16 (`NUMERIC(14,2)` money) |
| Validation | Zod schemas from `@tandem/shared` via `ZodValidationPipe` (no class-validator / class-transformer) |
| Config | `@nestjs/config` + Zod env schema (`src/config/env.ts`) — app fails fast on invalid env |
| Auth | Own email/password + JWT (access token as Bearer; refresh strategy decided at P1 start) |
| Money math | `Prisma.Decimal` (decimal.js) — never JS `number` |
| Tests | Jest + ts-jest + Supertest; e2e against real Postgres |
| Deploy | Docker container on Google Cloud Run (stateless); DB on Supabase PostgreSQL |

Local: `PORT=3001`, `DATABASE_URL=postgresql://tandem:tandem@localhost:5433/tandem`, global prefix `/api`, CORS limited to `CORS_ORIGIN`.

---

## 2. Folder structure

### Current state (P0)

```text
apps/api/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                    # DEV-ONLY demo household
├── src/
│   ├── main.ts                    # bootstrap: prefix /api, CORS, shutdown hooks
│   ├── app.module.ts
│   ├── config/env.ts              # Zod env validation
│   ├── prisma/                    # PrismaModule (global) + PrismaService
│   ├── common/                    # cross-cutting: ZodValidationPipe, money helpers
│   ├── health/                    # GET /api/health
│   └── categories/default-categories.ts   # seedDefaultCategories() — moves into modules/categories in P2
├── test/                          # e2e: *.e2e-spec.ts, jest-e2e.json, load-env.js
└── jest.config.js                 # unit tests (src/**/*.spec.ts)
```

### Target for every feature (from P1 on)

New features go in `src/modules/<feature>/`. Cross-cutting code stays in `src/common`, `src/config` and `src/prisma`.

```text
src/modules/transactions/
├── domain/
│   ├── transaction.ts                       # entity / value types + invariants
│   ├── transaction-rules.ts                 # pure rules (category/type compatibility, amount > 0)
│   ├── transaction.repository.ts            # abstract class TransactionRepository (port)
│   └── transaction.errors.ts                # domain errors
├── application/
│   ├── create-transaction.use-case.ts
│   ├── update-transaction.use-case.ts
│   ├── delete-transaction.use-case.ts
│   └── list-transactions.query.ts           # read-side query (may return DTOs directly)
├── infrastructure/
│   ├── prisma-transaction.repository.ts     # implements TransactionRepository
│   └── transaction.mapper.ts                # Prisma row ⇄ domain ⇄ response DTO
├── presentation/
│   └── transactions.controller.ts
├── transactions.module.ts
└── __tests__/ or *.spec.ts beside the files
```

Financial formulas go in the domain of the feature that owns them: `summaries/domain/period-totals.ts`, `budgets/domain/budget-utilization.ts`, `financial-progress/domain/month-comparison.ts` and `savings/domain/goal-progress.ts`. Never put them in controllers or repositories.

Feature modules, as listed in the root file: `auth`, `households`, `categories`, `transactions`, `budgets`, `summaries`, `financial-progress`, `savings`, `notifications`, `ai-insights`.

---

## 3. Clean Architecture rules

**Dependency direction:** presentation → application → domain ← infrastructure.

### Domain (`domain/`)
- Pure TypeScript: entities, value types, invariants, calculations, repository ports and domain errors.
- **Must not import** `@nestjs/*`, `@prisma/client`, `express` or anything that does I/O.
- Allowed imports: `decimal.js` for money, and types, enums and constants from `@tandem/shared`. Add `decimal.js` as an explicit dependency when the first domain money logic lands; `Prisma.Decimal` is a decimal.js instance, so the two interoperate.
- Repository ports are **abstract classes**, for example `export abstract class TransactionRepository { abstract findById(...): Promise<Transaction | null> }`. Nest can use an abstract class directly as a DI token, so no `Symbol` tokens are needed.
- Domain errors are plain classes (`class CategoryTypeMismatchError extends DomainError`). They carry no HTTP status codes.

### Application (`application/`)
- One use case per business operation. Each is a `@Injectable()` class with a single `execute(input)` method.
- A use case orchestrates: load through repositories, apply domain rules, persist, and trigger side effects such as notification checks.
- It receives the **authenticated context** (`userId`, `householdId`, `partnerSlot`) as an argument. It never reads the request object.
- It depends on ports (abstract classes), never on `PrismaService` directly. The exception is read-only query services, as described below.

### Infrastructure (`infrastructure/`)
- Prisma repositories implement the domain ports, and mappers convert Prisma rows to and from domain objects.
- **Every query is scoped by `householdId`.** No repository method can fetch household data without one.
- External adapters live here too, such as the console mail stub and the AI provider later.

### Presentation (`presentation/`)
- Controllers stay **thin**: parse and validate input with `ZodValidationPipe`, build the auth context, call one use case, and map the result to the response schema.
- No business logic, no Prisma, and no calculations in controllers.

### Pragmatism (avoid overengineering)
- **Simple reads:** a read-only `*.query.ts` may use `PrismaService` and return response DTOs directly. Don't build domain entities that have no behavior.
- **Interfaces:** don't add one when there is only one implementation and no real boundary, such as a mapper or a pure helper.
- **Base classes:** no generic `BaseRepository<T>` and no `BaseUseCase`.
- **CRUD-only features:** a feature with no rules (for example, marking notifications read) can skip the domain layer.

---

## 4. Patterns

| Pattern | Rule |
|---|---|
| Repository | Abstract class in `domain/`; Prisma implementation in `infrastructure/`; bound in the feature module with `{ provide: TransactionRepository, useClass: PrismaTransactionRepository }` |
| Use case | `XxxUseCase.execute(ctx, input)`; one public method; returns domain objects or plain result types |
| DTO | Request and response shapes are **Zod schemas in `@tandem/shared`**; the API uses their inferred types (`CreateTransactionInput`). Don't redefine shapes locally |
| Mapper | Plain functions (`toDomain`, `toResponse`). Money goes out through `fromDecimal()` (`src/common/money.ts`) as a 2-decimal string |
| Module | One Nest module per feature. Export only what another feature truly needs, preferably a use case or query, never a repository |

**SOLID, briefly:**
- Single responsibility per use case.
- Open/closed through new use cases, not flags.
- Liskov: repository implementations honor their port.
- Interface segregation: small, focused ports.
- Dependency inversion: use cases depend on ports.

**Dependency injection:** use constructor injection only. No `ModuleRef` lookups and no service locators. Inject the clock (`Clock` port) wherever "now" or "today" matters (budgets, comparisons, alerts) so tests are deterministic.

---

## 5. Prisma and PostgreSQL

- **Schema:** the schema lives in `prisma/schema.prisma` and follows roadmap §4.
  - Models are PascalCase and singular; table names equal model names (no `@@map`).
  - Ids are `cuid()`.
  - Every model that holds household data has `householdId`, with an index that starts with `householdId`.
- **Money and dates:**
  - Money columns are `Decimal @db.Decimal(14, 2)`. **Never `Float`.**
  - Calendar dates (`transactionDate`, `contributionDate`, `targetDate`) are `@db.Date`.
- **Constraints:** add DB CHECK constraints in raw SQL inside the migration, for rules the DB can enforce: `amount > 0`, `month BETWEEN 1 AND 12`, split `0–100`. Prisma does not track CHECKs, so they cause no drift.
- **Partial or functional unique indexes** also go in raw migration SQL, for example category name uniqueness among active categories.
- **Deletes:** use `onDelete: Restrict` where history must survive (category → transactions). Deactivate instead of deleting.
- **Seeding:** `seedDefaultCategories(db, householdId)` must stay idempotent and runs inside the household-creation transaction. `prisma/seed.ts` is dev-only and refuses to run in production.

### Migrations
- Create with `pnpm --filter @tandem/api exec prisma migrate dev --name <snake_case_description>`.
- Migrations are committed. **Never edit or delete an applied migration.** Write a new one instead.
- **Never** run `prisma migrate reset`, `db push --force-reset` or any destructive SQL against a database you didn't create for the task. Ask first.
- Deploy with `prisma migrate deploy` (Cloud Run start-up job or CI step), never `migrate dev`.
- `postinstall` runs `prisma generate`.

### Transaction management
- Any use case that writes more than one row atomically must run in a single DB transaction. Examples: household and owner member plus default categories; accepting an invite; a contribution plus the goal's `currentAmount`.
- **How:** repositories accept an optional `tx: Prisma.TransactionClient`, and the use case calls a small `TransactionRunner` port (`run(work)`) implemented with `prisma.$transaction`. Keep it this simple; no generic Unit of Work framework.
- Keep transactions short. Don't call external services (email, AI) inside them.

---

## 6. Financial precision

- All money math uses `Prisma.Decimal` / `decimal.js`. **Never** call `Number(amount)`, `parseFloat` or `+amount`, or use JS arithmetic on money.
- Incoming money is a validated decimal string (`positiveMoneyStringSchema`). Convert it with `toDecimal()` from `src/common/money.ts`.
- Outgoing money uses `fromDecimal()`, which gives a 2-decimal string.
- Do aggregations in SQL wherever possible (`_sum` / `SUM(amount)` returns Decimal). Don't load all rows to sum them in JS.
- Percentages:
  - Compute with Decimal, round **half-up to 2 decimals**, and return them as strings.
  - Return `null` when the denominator is zero (savings rate with income 0, variation with previous 0, utilization with no budget).
- Budget status follows the bands in the root file: `< 80` within, `80–99.99` approaching, `≥ 100` exceeded. Implement it once, in `budgets/domain`.
- Periods are calendar months **in the household's timezone** (`Household.timezone`) and filter on `transactionDate`, never `createdAt`. Month-over-month comparisons use equivalent periods (day 1–N against day 1–N).
- Savings contributions live in `SavingsContribution`. They are **never** `Transaction` rows and never count as expenses. Available Balance = income − expenses − contributions.

---

## 7. Authentication (own JWT)

- **AuthModule** handles register, login, refresh, logout, forgot password and reset password.
- **Passwords:**
  - Hashed with argon2id (or bcrypt if argon2 can't be built); confirm the choice in P1.
  - Never stored or logged in plain text.
  - Password reset tokens are random, single-use and stored hashed, with a short expiry.
- **Tokens:**
  - **Access token:** a short-lived JWT (around 15 minutes), signed with `JWT_ACCESS_SECRET`. Claims: `sub` (userId), `hid` (householdId, when the user has one), `iat` and `exp`. Keep the payload minimal.
  - **Refresh token:** signed with `JWT_REFRESH_SECRET`. Storage and transport (httpOnly cookie with rotation, or another option) are decided at P1 start. If rotation is chosen, store a hash of each refresh token in the DB so it can be revoked. The API remains stateless apart from the DB.
- **Request handling:**
  - A global `JwtAuthGuard` protects everything. Routes opt out explicitly with `@Public()`: health, register, login, refresh, forgot password and reset password.
  - `@CurrentUser()` exposes the authenticated context to controllers.
- **Email:** sending is behind a `Mailer` port. In dev the implementation is a console stub that logs the link; a real provider (Resend or SES) gets chosen before production.

## 8. Household authorization

- A `HouseholdGuard` (or a membership check inside the auth context factory) loads the user's `HouseholdMember` row and puts `{ userId, householdId, partnerSlot, role }` on the request context.
- **Every protected financial endpoint requires a household context.** Use cases always receive `householdId` from that context, **never from the URL, query or body**.
- When a route has a resource id (`/transactions/:id`), the repository must look it up **with** `householdId`. A row belonging to another household returns `404`.
- Ids referenced in a payload, such as `categoryId`, `paidById` or `savingsGoalId`, must also be checked against the household before use: the category must belong to the household, and `paidById` must be a member.
- Both members have equal permissions on financial data. `OWNER` / `MEMBER` only matters for household administration (invites).
- **Required test:** each protected endpoint has an e2e test with two households proving no cross-household read or write.

---

## 9. REST conventions

- Resources are plural kebab-case under `/api`: `GET/POST /transactions`, `GET/PATCH/DELETE /transactions/:id`, `POST /savings-goals/:id/contributions`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`.
- The household is implicit (taken from the token), so there is no `/households/:id/...` nesting for financial data. `GET /households/me` returns the current household.
- `POST` returns `201` with the created resource. `PATCH` updates partially. `DELETE` returns `204`.
- Summaries are read-only endpoints such as `GET /summaries/period?year=&month=&partner=`, `GET /financial-progress/comparison?...` and `GET /budgets?year=&month=`.
- Response shapes match the root file: money and percentages as strings, dates as `YYYY-MM-DD`, lists as `{ items }`.

## 10. Validation and errors

- Validate every body, query and param with `new ZodValidationPipe(schema)`, using a schema from `@tandem/shared`. Cross-row rules (the category belongs to the household, the type matches) are checked in the use case or domain.
- **Domain errors map to HTTP in one global exception filter:**

| Error | Status |
|---|---|
| Not found / other household | `404` |
| Duplicate / still in use | `409` |
| Business rule violated (e.g. category type mismatch, inactive category) | `422` |
| Forbidden | `403` |

- Unknown errors return `500` with a generic message. Log the details server-side; never leak stack traces or SQL to the client.
- Error bodies keep the shape `{ statusCode, message, error? }`, plus `issues` for validation errors.

## 11. Security

- **CORS** is limited to `CORS_ORIGIN`. Allow credentials only if the P1 refresh-token decision needs cookies.
- **Rate limiting:** add it to the auth endpoints in P1 (`@nestjs/throttler`, explaining the dependency).
- **Secrets** come only from env, validated in `env.ts`, and are never committed. `.env` is git-ignored and `.env.example` is kept current.
- **Raw SQL:** use `Prisma.sql` / `$queryRaw` tagged templates only, never string concatenation.
- **AI Insights (P6):** read-only data access and no mutations. Answers must be grounded in data the API computed; the model must not invent numbers.

## 12. Logging

- Use the Nest `Logger` with a class context (`new Logger(CreateTransactionUseCase.name)`). Log as JSON to stdout in production, which Cloud Run collects.
- **Log:** request id, method, path, status, duration, userId and householdId, at warn or error level for failures.
- **Never log:** passwords, tokens, reset links in production, full request bodies or lists of financial records.

---

## 13. Testing (Jest)

| Kind | Where | Runs with | DB |
|---|---|---|---|
| Unit — domain rules and formulas | `src/modules/*/domain/*.spec.ts` | `pnpm --filter @tandem/api test` | none |
| Unit — use cases | `*.use-case.spec.ts` with in-memory fake repositories | same | none |
| Controller (thin) | `*.controller.spec.ts` with mocked use cases and Supertest | same | none |
| Integration / e2e | `test/*.e2e-spec.ts` | `pnpm --filter @tandem/api test:e2e` | real Postgres (`pnpm db:up`) |

- **Every formula** in root §6 has tests covering normal values, zero denominators, rounding at the half-up boundary, and partner-filtered sets.
- **Every protected endpoint** has a two-household isolation e2e test.
- **E2E data:** tests create their own data with unique ids and clean up after themselves. Never truncate shared tables.
- **Time:** use the injected `Clock` for date-dependent logic; never mock `Date` globally.
- **Jest config:** keep the local `jest-cli` dev dependency and the `@prisma/client` `moduleNameMapper` in both Jest configs, because of environment quirks.

## 14. Naming

| Thing | Example |
|---|---|
| Use case | `create-transaction.use-case.ts` → `CreateTransactionUseCase` |
| Query | `list-transactions.query.ts` → `ListTransactionsQuery` |
| Port | `transaction.repository.ts` → `abstract class TransactionRepository` |
| Prisma adapter | `prisma-transaction.repository.ts` → `PrismaTransactionRepository` |
| Controller | `transactions.controller.ts` → `TransactionsController` |
| Module | `transactions.module.ts` → `TransactionsModule` |
| Mapper | `transaction.mapper.ts` (functions `toDomain`, `toResponse`) |
| Domain error | `transaction.errors.ts` → `TransactionNotFoundError` |
| Tests | `*.spec.ts` (unit), `*.e2e-spec.ts` (e2e) |

---

## 15. Workflow and checks

Follow root §12 (inspect → plan → approval → implement → verify → report). Before calling backend work done:

```bash
pnpm --filter @tandem/shared build           # if the contract changed
pnpm --filter @tandem/api build              # includes tsc type check
pnpm --filter @tandem/api test
pnpm --filter @tandem/api test:e2e           # Postgres must be running
pnpm --filter @tandem/api exec prisma migrate status
```

- **Lint:** ESLint isn't configured yet; propose it as its own change.
- **Contract changes** start in `@tandem/shared`. Tell the FE about any breaking change.
- **Smoke test:** start the API with `pnpm dev:api` (port 3001). Stop only the processes you started, by exact PID; something unrelated listens on port 3000.
