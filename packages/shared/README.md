# @tandem/shared

Single source of truth for API contracts shared by `apps/api` and `apps/web`.

- **Zod schemas** live here (`healthResponseSchema`, enums, `moneyStringSchema`, …).
- **API**: validates request bodies/queries with `ZodValidationPipe` (`apps/api/src/common/zod-validation.pipe.ts`) using these schemas → 400 with `{ message, issues }`.
- **Web**: reuses the same schemas with React Hook Form (`zodResolver`) and to parse API responses.
- **Money** is always a decimal string (`"1234.50"`) on the wire; the API converts to `Prisma.Decimal`. Never `parseFloat` money.
- Enums mirror `apps/api/prisma/schema.prisma` — update both together.

Build: `pnpm --filter @tandem/shared build` (emits CJS + `.d.ts` to `dist/`).
