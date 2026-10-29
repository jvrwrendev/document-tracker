-- Email verification support.
--
-- Existing accounts are backfilled as verified so that deploying this
-- migration never locks out users who registered before verification existed.

ALTER TABLE "User"
    ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

UPDATE "User"
    SET "emailVerifiedAt" = NOW()
    WHERE "emailVerifiedAt" IS NULL;

CREATE TABLE "EmailVerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationCode_userId_key"
    ON "EmailVerificationCode"("userId");

CREATE INDEX "EmailVerificationCode_expiresAt_idx"
    ON "EmailVerificationCode"("expiresAt");

ALTER TABLE "EmailVerificationCode"
    ADD CONSTRAINT "EmailVerificationCode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
