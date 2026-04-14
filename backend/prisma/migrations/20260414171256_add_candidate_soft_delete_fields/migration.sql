-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "anonymisedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "deletedReason" TEXT,
ADD COLUMN     "isAnonymised" BOOLEAN NOT NULL DEFAULT false;
