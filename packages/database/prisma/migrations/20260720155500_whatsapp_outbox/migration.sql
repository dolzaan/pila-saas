CREATE TABLE "whatsapp_outbound_messages" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "phoneEncrypted" TEXT NOT NULL,
    "payloadEncrypted" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'TEXT',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingStartedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_outbound_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "whatsapp_outbound_messages_status_check"
      CHECK ("status" IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD')),
    CONSTRAINT "whatsapp_outbound_messages_type_check"
      CHECK ("messageType" IN ('TEXT'))
);

CREATE INDEX "whatsapp_outbound_messages_status_nextAttemptAt_idx"
  ON "whatsapp_outbound_messages"("status", "nextAttemptAt");
CREATE INDEX "whatsapp_outbound_messages_createdAt_idx"
  ON "whatsapp_outbound_messages"("createdAt");
