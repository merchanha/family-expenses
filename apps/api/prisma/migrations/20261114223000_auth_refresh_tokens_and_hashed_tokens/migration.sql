-- P1 auth: tokens are stored hashed (sha256), never raw. Renames keep the migration
-- non-destructive (P0 tables held no tokens; values were never raw-token-compatible anyway).

-- HouseholdInvite.token -> tokenHash
DROP INDEX "HouseholdInvite_token_key";
ALTER TABLE "HouseholdInvite" RENAME COLUMN "token" TO "tokenHash";
CREATE UNIQUE INDEX "HouseholdInvite_tokenHash_key" ON "HouseholdInvite"("tokenHash");
CREATE INDEX "HouseholdInvite_householdId_status_idx" ON "HouseholdInvite"("householdId", "status");

-- PasswordResetToken.token -> tokenHash
DROP INDEX "PasswordResetToken_token_key";
ALTER TABLE "PasswordResetToken" RENAME COLUMN "token" TO "tokenHash";
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- MVP: a user belongs to at most one household (replaces the plain userId index).
DROP INDEX "HouseholdMember_userId_idx";
CREATE UNIQUE INDEX "HouseholdMember_userId_key" ON "HouseholdMember"("userId");

-- Refresh tokens (Decision #5): opaque, hashed, rotated, family-revocable.
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
