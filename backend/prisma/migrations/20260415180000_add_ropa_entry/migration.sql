-- CreateTable
CREATE TABLE "RopaEntry" (
    "id" TEXT NOT NULL,
    "processingActivity" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "dataCategories" TEXT[],
    "dataSubjects" TEXT NOT NULL,
    "recipients" TEXT NOT NULL,
    "retentionPeriod" TEXT NOT NULL,
    "securityMeasures" TEXT NOT NULL,
    "transfersOutsideEEA" BOOLEAN NOT NULL DEFAULT false,
    "transferMechanism" TEXT,
    "lastReviewedAt" TIMESTAMP(3),
    "lastReviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RopaEntry_pkey" PRIMARY KEY ("id")
);

-- Seed default recruitment processing activity
INSERT INTO "RopaEntry" ("id", "processingActivity", "purpose", "legalBasis", "dataCategories", "dataSubjects", "recipients", "retentionPeriod", "securityMeasures", "transfersOutsideEEA", "updatedAt")
VALUES (
    'ropa_recruitment_default',
    'Candidate recruitment processing',
    'Assessing candidate suitability for employment roles',
    'Legitimate Interests (GDPR Art. 6(1)(f))',
    ARRAY['Name', 'Contact details', 'Employment history', 'CV', 'Interview notes'],
    'Job applicants and candidates',
    'Recruiters and hiring team at [COMPANY_NAME]',
    'Active: process duration. Unsuccessful: 12 months. Talent pool: 24 months.',
    'HTTPS, JWT authentication, role-based access control, Supabase encryption at rest',
    false,
    NOW()
);
