import type { SubscriptionStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SubscriptionStateUpdate = {
  provider: "asaas" | "stripe";
  eventId: string;
  eventAt: Date;
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: Date | null;
  userId?: string | null;
  createWhenMissing?: boolean;
};

/**
 * Serializa eventos da mesma assinatura e ignora snapshots comprovadamente
 * mais antigos. O ID também torna a reaplicação do mesmo evento inofensiva.
 */
export async function applyOrderedSubscriptionState(
  input: SubscriptionStateUpdate,
) {
  const storedSubscriptionId = input.provider === "asaas"
    ? `asaas:${input.providerSubscriptionId}`
    : input.providerSubscriptionId;
  const lockKey = input.userId
    ? `subscription:user:${input.userId}`
    : `subscription:provider:${storedSubscriptionId}`;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtext(${lockKey}))
    `);

    const existing = input.userId
      ? await tx.subscription.findUnique({ where: { userId: input.userId } })
      : await tx.subscription.findUnique({
          where: { stripeSubscriptionId: storedSubscriptionId },
        });

    if (existing) {
      if (existing.lastPaymentEventId === input.eventId) {
        return { applied: false, duplicate: true, created: false };
      }
      if (
        existing.lastPaymentEventAt
        && input.eventAt.getTime() < existing.lastPaymentEventAt.getTime()
      ) {
        return { applied: false, stale: true, created: false };
      }

      await tx.subscription.update({
        where: { id: existing.id },
        data: {
          stripeSubscriptionId: storedSubscriptionId,
          status: input.status,
          plan: input.status === "ACTIVE" || input.status === "TRIALING"
            ? "pro"
            : existing.plan,
          currentPeriodEnd: input.currentPeriodEnd,
          lastPaymentEventAt: input.eventAt,
          lastPaymentEventId: input.eventId,
        },
      });
      return { applied: true, created: false };
    }

    if (!input.userId || !input.createWhenMissing) {
      return { applied: false, missing: true, created: false };
    }

    await tx.subscription.create({
      data: {
        userId: input.userId,
        stripeSubscriptionId: storedSubscriptionId,
        status: input.status,
        plan: "pro",
        currentPeriodEnd: input.currentPeriodEnd,
        lastPaymentEventAt: input.eventAt,
        lastPaymentEventId: input.eventId,
      },
    });
    return { applied: true, created: true };
  });
}
