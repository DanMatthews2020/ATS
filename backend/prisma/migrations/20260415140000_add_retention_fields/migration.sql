-- CreateEnum
CREATE TYPE "RetentionStatus" AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'ANONYMISED');

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN "retentionStatus" "RetentionStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Candidate" ADD COLUMN "lastActivityAt" TIMESTAMP(3);

-- Backfill lastActivityAt from updatedAt
UPDATE "Candidate" SET "lastActivityAt" = "updatedAt" WHERE "lastActivityAt" IS NULL;
