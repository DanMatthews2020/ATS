-- AlterTable
ALTER TABLE "WorkflowStage" ADD COLUMN     "scorecardId" TEXT;

-- CreateTable
CREATE TABLE "Scorecard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScorecardCriterion" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScorecardCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateEvaluation" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "stageId" TEXT,
    "scorecardId" TEXT,
    "submittedById" TEXT NOT NULL,
    "overallRecommendation" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationResponse" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "responseValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationResponse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkflowStage" ADD CONSTRAINT "WorkflowStage_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "Scorecard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardCriterion" ADD CONSTRAINT "ScorecardCriterion_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "Scorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvaluation" ADD CONSTRAINT "CandidateEvaluation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvaluation" ADD CONSTRAINT "CandidateEvaluation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvaluation" ADD CONSTRAINT "CandidateEvaluation_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "WorkflowStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvaluation" ADD CONSTRAINT "CandidateEvaluation_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "Scorecard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvaluation" ADD CONSTRAINT "CandidateEvaluation_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResponse" ADD CONSTRAINT "EvaluationResponse_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "CandidateEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResponse" ADD CONSTRAINT "EvaluationResponse_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "ScorecardCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
