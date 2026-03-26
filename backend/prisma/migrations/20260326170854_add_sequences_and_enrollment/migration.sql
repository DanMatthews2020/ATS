-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "currentCompany" TEXT;

-- AlterTable
ALTER TABLE "Sequence" ADD COLUMN     "isShared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linkedJobId" TEXT,
ADD COLUMN     "senderEmail" TEXT,
ADD COLUMN     "skipWeekends" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stopOnHired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SequenceEnrollment" ADD COLUMN     "clicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "opens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "response" TEXT,
ADD COLUMN     "sendFrom" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SequenceStep" ADD COLUMN     "body" TEXT,
ADD COLUMN     "delayDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sendFrom" TEXT,
ADD COLUMN     "subject" TEXT;
