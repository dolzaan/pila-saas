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

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "payment_webhook_events"
      ("id", "provider", "eventType", "payload", "receivedAt")
    VALUES
      (${payload.id}, 'ASAAS', ${payload.event}, ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT ("id") DO UPDATE SET
      "eventType" = EXCLUDED."eventType",
      "payload" = EXCLUDED."payload",
      "receivedAt" = NOW()
  `);

  try {
    const status = mapAsaasPaymentEvent(payload.event);
    const providerSubscriptionId = getAsaasSubscriptionId(payload);
    let userId = getAsaasExternalReference(payload);

    if (!userId && payload.checkout?.id) {
      const checkout = await asaasGateway.getCheckout(payload.checkout.id);
      userId = checkout.externalReference ?? null;
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
    if (userId && status) {
      const result = await prisma.subscription.updateMany({
        where: { userId },
        data: { status },
      });
      updatedSubscriptions = result.count;
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
    });
  } catch (error) {
    console.error("[webhooks.asaas]", error);
    return NextResponse.json({ received: true, processingError: true });
  }
}
