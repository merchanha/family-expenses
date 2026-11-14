/**
 * DEV-ONLY seed. Creates a demo household with the default category template so the
 * template can be inspected locally. Real households get categories via
 * seedDefaultCategories() at creation time (P1). Idempotent.
 */
import { PrismaClient } from '@prisma/client';
import { seedDefaultCategories } from '../src/categories/default-categories';

const prisma = new PrismaClient();
const DEV_HOUSEHOLD_ID = 'dev-demo-household';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping dev seed in production.');
    return;
  }
  await prisma.household.upsert({
    where: { id: DEV_HOUSEHOLD_ID },
    update: {},
    create: { id: DEV_HOUSEHOLD_ID, name: 'Demo Shared Space (dev only)' },
  });
  const created = await seedDefaultCategories(prisma, DEV_HOUSEHOLD_ID);
  const total = await prisma.category.count({ where: { householdId: DEV_HOUSEHOLD_ID } });
  console.log(`Dev seed: +${created} categories (total ${total}) for ${DEV_HOUSEHOLD_ID}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
