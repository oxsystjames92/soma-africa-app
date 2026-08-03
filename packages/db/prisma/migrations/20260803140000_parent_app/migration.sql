-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('SENT', 'FAILED', 'SUPPRESSED_OPT_OUT', 'SUPPRESSED_RATE_LIMIT');

-- AlterTable
ALTER TABLE "Guardian" ADD COLUMN     "identityId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "narration" TEXT,
ADD COLUMN     "payerName" TEXT;

-- CreateTable
CREATE TABLE "GuardianIdentity" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otpHash" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayerProfile" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "msisdn" TEXT NOT NULL,
    "channel" "PaymentChannel" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderPreference" (
    "identityId" TEXT NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderPreference_pkey" PRIMARY KEY ("identityId","channel")
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "channel" "ReminderChannel" NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "ReminderStatus" NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuardianIdentity_phone_key" ON "GuardianIdentity"("phone");

-- CreateIndex
CREATE INDEX "PayerProfile_identityId_idx" ON "PayerProfile"("identityId");

-- CreateIndex
CREATE UNIQUE INDEX "PayerProfile_identityId_msisdn_key" ON "PayerProfile"("identityId", "msisdn");

-- CreateIndex
CREATE INDEX "ReminderLog_identityId_createdAt_idx" ON "ReminderLog"("identityId", "createdAt");

-- CreateIndex
CREATE INDEX "ReminderLog_schoolId_createdAt_idx" ON "ReminderLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "Guardian_identityId_idx" ON "Guardian"("identityId");

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "GuardianIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayerProfile" ADD CONSTRAINT "PayerProfile_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "GuardianIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderPreference" ADD CONSTRAINT "ReminderPreference_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "GuardianIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "GuardianIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

