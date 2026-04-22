-- CreateTable
CREATE TABLE "RejectionReason" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RejectionReason_pkey" PRIMARY KEY ("id")
);

-- Seed default reasons
INSERT INTO "RejectionReason"
  (id, label, description, "isDefault", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Failed interview', 'Candidate did not meet the required standard at interview', true, true, 1, NOW(), NOW()),
  (gen_random_uuid(), 'Lack of communication', 'Candidate was unresponsive during the process', true, true, 2, NOW(), NOW()),
  (gen_random_uuid(), 'Overqualified', 'Candidate experience significantly exceeds role requirements', true, true, 3, NOW(), NOW()),
  (gen_random_uuid(), 'Insufficient experience', 'Candidate does not have enough relevant experience', true, true, 4, NOW(), NOW()),
  (gen_random_uuid(), 'Role filled internally', 'Position was filled by an internal candidate', true, true, 5, NOW(), NOW()),
  (gen_random_uuid(), 'Withdrew from process', 'Candidate withdrew their own application', true, true, 6, NOW(), NOW()),
  (gen_random_uuid(), 'Salary expectations', 'Candidate salary expectations could not be aligned', true, true, 7, NOW(), NOW()),
  (gen_random_uuid(), 'Culture fit', 'Candidate was not the right fit for the team', true, true, 8, NOW(), NOW());
