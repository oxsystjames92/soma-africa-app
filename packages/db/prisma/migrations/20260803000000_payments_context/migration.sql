-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "payerPhone" TEXT NOT NULL,
ADD COLUMN     "somaRef" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "providerRef" DROP NOT NULL,
ALTER COLUMN "paidAt" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundCallback" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "somaRef" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundCallback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "batchRef" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL,
    "expectedMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_tokenHash_key" ON "PaymentIntent"("tokenHash");

-- CreateIndex
CREATE INDEX "PaymentIntent_expiresAt_idx" ON "PaymentIntent"("expiresAt");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_schoolId_idx" ON "WebhookEndpoint"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_idempotencyKey_key" ON "WebhookDelivery"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_nextAttemptAt_idx" ON "WebhookDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_schoolId_idx" ON "WebhookDelivery"("schoolId");

-- CreateIndex
CREATE INDEX "InboundCallback_somaRef_idx" ON "InboundCallback"("somaRef");

-- CreateIndex
CREATE UNIQUE INDEX "InboundCallback_provider_eventId_key" ON "InboundCallback"("provider", "eventId");

-- CreateIndex
CREATE INDEX "Settlement_schoolId_idx" ON "Settlement"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_provider_batchRef_key" ON "Settlement"("provider", "batchRef");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_somaRef_key" ON "Payment"("somaRef");

-- CreateIndex
CREATE INDEX "Payment_schoolId_status_idx" ON "Payment"("schoolId", "status");

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

