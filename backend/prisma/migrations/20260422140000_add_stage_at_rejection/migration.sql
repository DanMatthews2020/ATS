-- AlterTable (additive, nullable — safe for existing rejected records)
ALTER TABLE "ApplicationRejection" ADD COLUMN "stageAtRejection" TEXT;
