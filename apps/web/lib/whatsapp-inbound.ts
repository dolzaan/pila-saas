import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const STALE_PROCESSING_MS = 5 * 60 * 1000;
const MAX_CLAIM_ATTEMPTS = 3;
const MAX_ERROR_LENGTH = 1_000;

export type WhatsappInboundClaim =
  | { state: "CLAIMED"; attempts: number }
  | { state: "COMPLETED"; attempts: number }
  | { state: "PROCESSING"; attempts: number };

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function claimWhatsappInboundMessage(
  id: string,
  phone: string
): Promise<WhatsappInboundClaim> {
  const now = new Date();

  try {
    const created = await prisma.whatsappInboundMessage.create({
      data: {
        id,
        phone,
        status: "PROCESSING",
        attempts: 1,
        processingStartedAt: now,
      },
      select: { attempts: true },
    });
    return { state: "CLAIMED", attempts: created.attempts };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }

  for (let claimAttempt = 0; claimAttempt < MAX_CLAIM_ATTEMPTS; claimAttempt++) {
    const existing = await prisma.whatsappInboundMessage.findUnique({
      where: { id },
      select: {
        status: true,
        attempts: true,
        processingStartedAt: true,
      },
    });

    if (!existing) {
      // O registro pode ter sido removido entre a colisão e a leitura.
      return claimWhatsappInboundMessage(id, phone);
    }

    if (existing.status === "COMPLETED") {
      return { state: "COMPLETED", attempts: existing.attempts };
    }

    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    if (
      existing.status === "PROCESSING" &&
      existing.processingStartedAt &&
      existing.processingStartedAt > staleBefore
    ) {
      return { state: "PROCESSING", attempts: existing.attempts };
    }

    const claimableWhere =
      existing.status === "FAILED"
        ? { id, status: "FAILED" as const }
        : {
            id,
            status: "PROCESSING" as const,
            OR: [
              { processingStartedAt: null },
              { processingStartedAt: { lte: staleBefore } },
            ],
          };

    const claimed = await prisma.whatsappInboundMessage.updateMany({
      where: claimableWhere,
      data: {
        phone,
        status: "PROCESSING",
        attempts: { increment: 1 },
        processingStartedAt: new Date(),
        completedAt: null,
        failedAt: null,
        lastError: null,
      },
    });

    if (claimed.count === 1) {
      return {
        state: "CLAIMED",
        attempts: existing.attempts + 1,
      };
    }
  }

  const latest = await prisma.whatsappInboundMessage.findUnique({
    where: { id },
    select: { status: true, attempts: true },
  });

  if (latest?.status === "COMPLETED") {
    return { state: "COMPLETED", attempts: latest.attempts };
  }

  return {
    state: "PROCESSING",
    attempts: latest?.attempts || 1,
  };
}

export async function completeWhatsappInboundMessage(id: string) {
  const result = await prisma.whatsappInboundMessage.updateMany({
    where: { id, status: "PROCESSING" },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      failedAt: null,
      lastError: null,
    },
  });

  if (result.count !== 1) {
    throw new Error(
      "Não foi possível concluir o estado da mensagem do WhatsApp."
    );
  }
}

export async function failWhatsappInboundMessage(
  id: string,
  error: unknown
) {
  const message =
    error instanceof Error ? error.message : "Erro desconhecido";

  const result = await prisma.whatsappInboundMessage.updateMany({
    where: { id, status: "PROCESSING" },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      lastError: message.slice(0, MAX_ERROR_LENGTH),
    },
  });

  if (result.count !== 1) {
    throw new Error(
      "Não foi possível marcar a mensagem do WhatsApp como falha."
    );
  }
}
