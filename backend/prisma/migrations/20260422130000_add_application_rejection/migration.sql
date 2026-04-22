-- CreateTable
CREATE TABLE "ApplicationRejection" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reasonId" TEXT,
    "reasonLabel" TEXT NOT NULL,
    "note" TEXT,
    "rejectedBy" TEXT NOT NULL,
    "rejectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationRejection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationRejection_applicationId_key" ON "ApplicationRejection"("applicationId");

-- AddForeignKey
ALTER TABLE "ApplicationRejection" ADD CONSTRAINT "ApplicationRejection_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationRejection" ADD CONSTRAINT "ApplicationRejection_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "RejectionReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
