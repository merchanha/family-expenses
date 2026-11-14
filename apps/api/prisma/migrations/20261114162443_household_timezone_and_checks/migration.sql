-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires';

-- Business-rule guards Prisma can't express (BUSINESS_RULES §2.3, §3, §5). Defense in depth;
-- the API also validates via Zod. Prisma ignores CHECK constraints, so no schema drift.
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_month_range" CHECK ("month" BETWEEN 1 AND 12);
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_targetAmount_positive" CHECK ("targetAmount" > 0);
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_currentAmount_nonneg" CHECK ("currentAmount" >= 0);
ALTER TABLE "SavingsContribution" ADD CONSTRAINT "SavingsContribution_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Household" ADD CONSTRAINT "Household_split_range" CHECK ("defaultSplitPartner1Percent" BETWEEN 0 AND 100);
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_split_range" CHECK ("splitPartner1Percent" IS NULL OR "splitPartner1Percent" BETWEEN 0 AND 100);
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_split_range" CHECK ("splitPartner1Percent" IS NULL OR "splitPartner1Percent" BETWEEN 0 AND 100);
