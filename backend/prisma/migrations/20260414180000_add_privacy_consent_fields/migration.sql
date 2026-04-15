-- CreateEnum
CREATE TYPE "LegalBasis" AS ENUM ('LEGITIMATE_INTERESTS', 'CONSENT', 'CONTRACT');

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN "legalBasis" "LegalBasis" NOT NULL DEFAULT 'LEGITIMATE_INTERESTS',
ADD COLUMN "privacyNoticeSentAt" TIMESTAMP(3),
ADD COLUMN "privacyNoticeSentBy" TEXT,
ADD COLUMN "consentGivenAt" TIMESTAMP(3),
ADD COLUMN "consentScope" TEXT,
ADD COLUMN "retentionExpiresAt" TIMESTAMP(3),
ADD COLUMN "retentionNote" TEXT;
