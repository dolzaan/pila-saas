-- Execute uma vez no SQL Editor do Supabase antes de publicar o código deste PR.
-- O script é idempotente e preserva os registros criados pela versão anterior.

DO $$
BEGIN
  CREATE TYPE "WhatsappInboundStatus" AS ENUM (
    'PROCESSING',
    'COMPLETED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "whatsapp_inbound_messages"
  ADD COLUMN IF NOT EXISTS "status"
    "WhatsappInboundStatus" NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS "attempts"
    INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "processingStartedAt"
    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completedAt"
    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failedAt"
    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastError"
    TEXT;

CREATE INDEX IF NOT EXISTS
  "whatsapp_inbound_messages_status_processingStartedAt_idx"
ON "whatsapp_inbound_messages" ("status", "processingStartedAt");
