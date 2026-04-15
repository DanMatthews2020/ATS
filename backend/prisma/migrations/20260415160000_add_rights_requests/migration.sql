-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('SAR', 'ERASURE', 'PORTABILITY', 'RECTIFICATION', 'OBJECTION');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'FULFILLED', 'REJECTED', 'OVERDUE');

-- CreateTable
CREATE TABLE "CandidateRightsRequest" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT,
    "requesterEmail" TEXT NOT NULL,
    "requestType" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "fulfilledAt" TIMESTAMP(3),
    "fulfilledBy" TEXT,
    "notes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateRightsRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CandidateRightsRequest_status_idx" ON "CandidateRightsRequest"("status");

-- CreateIndex
CREATE INDEX "CandidateRightsRequest_dueAt_idx" ON "CandidateRightsRequest"("dueAt");

-- AddForeignKey
ALTER TABLE "CandidateRightsRequest" ADD CONSTRAINT "CandidateRightsRequest_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
