-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EnrollmentStatus" ADD VALUE 'ENROLLED';
ALTER TYPE "EnrollmentStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "EnrollmentStatus" ADD VALUE 'REPLIED';
ALTER TYPE "EnrollmentStatus" ADD VALUE 'INTERESTED';
ALTER TYPE "EnrollmentStatus" ADD VALUE 'CONVERTED';
