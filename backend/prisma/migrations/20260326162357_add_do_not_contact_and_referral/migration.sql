-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "doNotContact" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "doNotContactAt" TIMESTAMP(3),
ADD COLUMN     "doNotContactNote" TEXT,
ADD COLUMN     "doNotContactReason" TEXT;

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "referredByName" TEXT NOT NULL,
    "referredByEmail" TEXT,
    "relationship" TEXT NOT NULL,
    "jobId" TEXT,
    "jobTitle" TEXT,
    "note" TEXT,
    "referralDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
