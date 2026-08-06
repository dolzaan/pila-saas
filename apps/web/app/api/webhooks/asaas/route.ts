import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asaasGateway } from "@/lib/payments/asaas";
import {
  getAsaasExternalReference,
  getAsaasSubscriptionId,
  isValidAsaasWebhookToken,
  mapAsaasPaymentEvent,
  type AsaasWebhookPayload,
} from "@/lib/payments/asaas-webhook";

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

  const insertedEvents = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    INSERT INTO "payment_webhook_events"
      ("id", "provider", "eventType", "payload", "receivedAt")
    VALUES
      (${payload.id}, 'ASAAS', ${payload.event}, ${JSON.stringify(payload)}::jsonb, NOW())
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
          "updatedAt" = NOW()
        WHERE "provider" = 'ASAAS'
          AND "providerSubscriptionId" = ${providerSubscriptionId}
      `);
    }

    let updatedSubscriptions = 0;
    let createdSubscription = false;

    if (userId && status) {
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (existingSubscription) {
        await prisma.subscription.update({
          where: { userId },
          data: {
            status,
            plan: status === "ACTIVE" ? "pro" : undefined,
          },
        });
        updatedSubscriptions = 1;
      } else if (status === "ACTIVE") {
        const asaasReference =
          providerSubscriptionId ?? payload.checkout?.id ?? checkoutExternalReference ?? payload.id;

        await prisma.subscription.create({
          data: {
            userId,
            stripeSubscriptionId: `asaas:${asaasReference}`,
            status: "ACTIVE",
            plan: "pro",
            currentPeriodEnd: payload.subscription?.nextDueDate
              ? new Date(payload.subscription.nextDueDate)
              : null,
          },
        });
        updatedSubscriptions = 1;
        createdSubscription = true;
      }
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
