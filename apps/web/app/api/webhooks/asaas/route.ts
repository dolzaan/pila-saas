import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asaasGateway } from "@/lib/payments/asaas";
import {
  getAsaasExternalReference,
  getAsaasEventOccurredAt,
  getAsaasSubscriptionId,
  isValidAsaasWebhookToken,
  mapAsaasPaymentEvent,
  type AsaasWebhookPayload,
} from "@/lib/payments/asaas-webhook";
import { applyOrderedSubscriptionState } from "@/lib/payments/subscription-state";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = request.headers.get("asaas-access-token");
  if (!isValidAsaasWebhookToken(token)) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as AsaasWebhookPayload | null;
  if (!payload?.id || !payload.event) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const receivedAt = new Date();
  const eventOccurredAt = getAsaasEventOccurredAt(payload, receivedAt);

  const insertedEvents = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    INSERT INTO "payment_webhook_events"
      ("id", "provider", "eventType", "payload", "receivedAt", "occurredAt")
    VALUES
      (${payload.id}, 'ASAAS', ${payload.event}, ${JSON.stringify(payload)}::jsonb, ${receivedAt}, ${eventOccurredAt})
    ON CONFLICT ("id") DO NOTHING
    RETURNING "id"
  `);

  if (insertedEvents.length === 0) {
    const existingEvents = await prisma.$queryRaw<Array<{ processedAt: Date | null }>>(Prisma.sql`
      SELECT "processedAt"
      FROM "payment_webhook_events"
      WHERE "id" = ${payload.id} AND "provider" = 'ASAAS'
      LIMIT 1
    `);
    if (existingEvents[0]?.processedAt) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  try {
    const status = mapAsaasPaymentEvent(payload.event);
    const providerSubscriptionId = getAsaasSubscriptionId(payload);
    let userId = getAsaasExternalReference(payload);
    let checkoutExternalReference: string | null = null;

    if (!userId && payload.checkout?.id) {
      const checkout = await asaasGateway.getCheckout(payload.checkout.id);
      checkoutExternalReference = checkout.externalReference ?? null;
      userId = checkoutExternalReference;
    }

    if (!userId && providerSubscriptionId) {
      const rows = await prisma.$queryRaw<Array<{ userId: string }>>(Prisma.sql`
        SELECT "userId"
        FROM "payment_subscriptions"
        WHERE "provider" = 'ASAAS'
          AND "providerSubscriptionId" = ${providerSubscriptionId}
        LIMIT 1
      `);
      userId = rows[0]?.userId ?? null;
    }

    if (providerSubscriptionId) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "payment_subscriptions"
        SET
          "status" = COALESCE(${status}, "status"),
          "nextDueDate" = COALESCE(${payload.subscription?.nextDueDate ? new Date(payload.subscription.nextDueDate) : null}, "nextDueDate"),
          "lastEventAt" = ${eventOccurredAt},
          "updatedAt" = NOW()
        WHERE "provider" = 'ASAAS'
          AND "providerSubscriptionId" = ${providerSubscriptionId}
          AND ("lastEventAt" IS NULL OR "lastEventAt" <= ${eventOccurredAt})
      `);
    }

    let updatedSubscriptions = 0;
    let createdSubscription = false;

    if (userId && status) {
      const asaasReference =
        providerSubscriptionId ?? payload.checkout?.id ?? checkoutExternalReference ?? payload.id;
      const result = await applyOrderedSubscriptionState({
        provider: "asaas",
        eventId: payload.id,
        eventAt: eventOccurredAt,
        providerSubscriptionId: asaasReference,
        userId,
        status,
        currentPeriodEnd: payload.subscription?.nextDueDate
          ? new Date(payload.subscription.nextDueDate)
          : undefined,
        createWhenMissing: status === "ACTIVE",
      });
      updatedSubscriptions = result.applied ? 1 : 0;
      createdSubscription = result.created;
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "payment_webhook_events"
      SET "processedAt" = NOW()
      WHERE "id" = ${payload.id}
    `);

    return NextResponse.json({
      received: true,
      statusApplied: status,
      userResolved: Boolean(userId),
      updatedSubscriptions,
      createdSubscription,
    });
  } catch (error) {
    console.error("[webhooks.asaas]", error);
    // O Asaas repete a entrega quando recebe resposta fora da faixa 2xx.
    return NextResponse.json(
      { received: false, processingError: true },
      { status: 500 },
    );
  }
}
