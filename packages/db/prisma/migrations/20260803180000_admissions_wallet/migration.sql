-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "WalletEntryType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'CASHOUT', 'ADJUSTMENT', 'REVERSAL');

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "applicantFirst" TEXT NOT NULL,
    "applicantLast" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "appliedFor" TEXT NOT NULL,
    "guardianName" TEXT NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "guardianEmail" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "studentId" TEXT,
    "notes" TEXT,
    "otpHash" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus" NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "balanceMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletEntry" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" "WalletEntryType" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "balanceAfterMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentId" TEXT,
    "actorId" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_reference_key" ON "Application"("reference");

-- CreateIndex
CREATE INDEX "Application_schoolId_status_idx" ON "Application"("schoolId", "status");

-- CreateIndex
CREATE INDEX "Application_guardianPhone_idx" ON "Application"("guardianPhone");

-- CreateIndex
CREATE INDEX "ApplicationEvent_applicationId_createdAt_idx" ON "ApplicationEvent"("applicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_studentId_key" ON "Wallet"("studentId");

-- CreateIndex
CREATE INDEX "Wallet_schoolId_idx" ON "Wallet"("schoolId");

-- CreateIndex
CREATE INDEX "WalletEntry_walletId_createdAt_idx" ON "WalletEntry"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletEntry_schoolId_createdAt_idx" ON "WalletEntry"("schoolId", "createdAt");

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Append-only wallet and admissions history ───────────────────────────────
-- Pocket money belongs to a child and an admissions decision is disputable, so
-- both trails are immutable for the same reason the ledger is.
CREATE TRIGGER wallet_entry_append_only
  BEFORE UPDATE OR DELETE ON "WalletEntry"
  FOR EACH ROW EXECUTE FUNCTION soma_ledger_append_only();

CREATE TRIGGER wallet_entry_no_truncate
  BEFORE TRUNCATE ON "WalletEntry"
  FOR EACH STATEMENT EXECUTE FUNCTION soma_ledger_append_only();

CREATE TRIGGER application_event_append_only
  BEFORE UPDATE OR DELETE ON "ApplicationEvent"
  FOR EACH ROW EXECUTE FUNCTION soma_ledger_append_only();
