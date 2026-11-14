import { Prisma, PrismaClient } from '@prisma/client';
import { DEFAULT_CATEGORIES } from '@tandem/shared';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Idempotently create the default envelope template for a household.
 * Called inside the household-creation transaction. Skips names that already exist for that type
 * (case-insensitive, active or not), so it never trips the unique-active-name index (P1-015).
 */
export async function seedDefaultCategories(db: Db, householdId: string): Promise<number> {
  const existing = await db.category.findMany({
    where: { householdId },
    select: { name: true, type: true },
  });
  const key = (type: string, name: string) => `${type}:${name.toLowerCase()}`;
  const have = new Set(existing.map((c) => key(c.type, c.name)));
  const toCreate = DEFAULT_CATEGORIES.filter((c) => !have.has(key(c.type, c.name))).map((c) => ({
    householdId,
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    isDefault: true,
  }));
  if (toCreate.length === 0) return 0;
  // skipDuplicates (ON CONFLICT DO NOTHING) also covers a concurrent insert of the same name.
  const { count } = await db.category.createMany({ data: toCreate, skipDuplicates: true });
  return count;
}
