-- P1-015 (FOR-101): one ACTIVE category per (household, type, case-insensitive name).
-- Deactivated categories don't count, so a name can be reused after deactivation.
-- Partial + functional index: Prisma can't express it, so it lives only in SQL (no schema drift).
CREATE UNIQUE INDEX "Category_householdId_type_lower_name_active_key"
  ON "Category" ("householdId", "type", lower("name"))
  WHERE "isActive";
