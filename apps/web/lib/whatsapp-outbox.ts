import { randomUUID } from "node:crypto";
import { decryptData, encryptData } from "@/lib/data-encryption";
import { prisma } from "@/lib/prisma";

export type WhatsappOutboxRow = {
  id: string;
  phoneEncrypted: string;
  payloadEncrypted: string;
  attempts: number;
};

const MAX_ATTEMPTS = 5;

export async function enqueueWhatsappTextMessage(input: {
  phone: string;
  text: string;
  error?: string;
}) {
  const phoneEncrypted = encryptData(input.phone);
  const payloadEncrypted = encryptData(input.text);

  await prisma.$executeRaw`
    INSERT INTO "whatsapp_outbound_messages" (
      "id",
      "status",
      "phoneEncrypted",
      "payloadEncrypted",
      "messageType",
      "attempts",
      "nextAttemptAt",
      "lastError",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      'PENDING',
      ${phoneEncrypted},
      ${payloadEncrypted},
      'TEXT',
      0,
      CURRENT_TIMESTAMP,
      ${input.error?.slice(0, 500) || null},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `;
}

export async function claimWhatsappOutboxMessages(limit = 25) {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));

  return prisma.$queryRaw<WhatsappOutboxRow[]>`
    WITH candidates AS (
      SELECT "id"
      FROM "whatsapp_outbound_messages"
      WHERE "status" IN ('PENDING', 'FAILED')
        AND "nextAttemptAt" <= CURRENT_TIMESTAMP
        AND "attempts" < ${MAX_ATTEMPTS}
      ORDER BY "nextAttemptAt" ASC, "createdAt" ASC
      LIMIT ${safeLimit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "whatsapp_outbound_messages" AS messages
    SET
      "status" = 'PROCESSING',
      "processingStartedAt" = CURRENT_TIMESTAMP,
      "updatedAt" = CURRENT_TIMESTAMP
    FROM candidates
    WHERE messages."id" = candidates."id"
    RETURNING
      messages."id",
      messages."phoneEncrypted",
      messages."payloadEncrypted",
      messages."attempts"
  `;
}

export function decryptWhatsappOutboxMessage(row: WhatsappOutboxRow) {
  return {
    id: row.id,
    phone: decryptData(row.phoneEncrypted),
    text: decryptData(row.payloadEncrypted),
    attempts: row.attempts,
  };
}

function retryDelayMinutes(attempts: number) {
  const delays = [15, 60, 360, 1_440, 1_440];
  return delays[Math.min(Math.max(0, attempts), delays.length - 1)];
}

export async function markWhatsappOutboxSent(id: string) {
  await prisma.$executeRaw`
    UPDATE "whatsapp_outbound_messages"
    SET
      "status" = 'SENT',
      "sentAt" = CURRENT_TIMESTAMP,
      "processingStartedAt" = NULL,
      "lastError" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${id}
  `;
}

export async function markWhatsappOutboxFailed(input: {
  id: string;
  previousAttempts: number;
  error: string;
}) {
  const nextAttempts = input.previousAttempts + 1;
  const nextStatus = nextAttempts >= MAX_ATTEMPTS ? "DEAD" : "FAILED";
  const delayMinutes = retryDelayMinutes(input.previousAttempts);

  await prisma.$executeRaw`
    UPDATE "whatsapp_outbound_messages"
    SET
      "status" = ${nextStatus},
      "attempts" = ${nextAttempts},
      "nextAttemptAt" = CURRENT_TIMESTAMP + (${delayMinutes} * INTERVAL '1 minute'),
      "processingStartedAt" = NULL,
      "lastError" = ${input.error.slice(0, 500)},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${input.id}
  `;
}

export async function releaseStaleWhatsappOutboxMessages() {
  return prisma.$executeRaw`
    UPDATE "whatsapp_outbound_messages"
    SET
      "status" = 'FAILED',
      "processingStartedAt" = NULL,
      "nextAttemptAt" = CURRENT_TIMESTAMP,
      "lastError" = COALESCE("lastError", 'Processamento interrompido'),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "status" = 'PROCESSING'
      AND "processingStartedAt" < CURRENT_TIMESTAMP - INTERVAL '15 minutes'
  `;
}
