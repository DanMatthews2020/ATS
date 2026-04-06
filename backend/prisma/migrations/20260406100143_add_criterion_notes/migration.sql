-- AlterTable
ALTER TABLE "EvaluationResponse" ADD COLUMN     "responseNotes" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ScorecardCriterion" ADD COLUMN     "allowNotes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notesLabel" TEXT NOT NULL DEFAULT 'Notes',
ADD COLUMN     "notesPlaceholder" TEXT,
ADD COLUMN     "notesRequired" BOOLEAN NOT NULL DEFAULT false;
