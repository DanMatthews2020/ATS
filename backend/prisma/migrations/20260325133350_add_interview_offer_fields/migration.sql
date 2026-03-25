-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "location" TEXT,
ADD COLUMN     "meetingLink" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "recommendation" TEXT;

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "benefits" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "equity" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "signatureUrl" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);
