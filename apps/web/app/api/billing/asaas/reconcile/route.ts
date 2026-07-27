import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { asaasGateway } from "@/lib/payments/asaas";

type CheckoutWebhookRow = {
  id: string;
  payload: {
    checkout?: {
      id?: string;
    };
  };
};

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const events = await prisma.$queryRaw<CheckoutWebhookRow[]>(Prisma.sql`
      SELECT "id", "payload"
      FROM "payment_webhook_events"
      WHERE "provider" = 'ASAAS'
        AND "eventType" = 'CHECKOUT_PAID'
      ORDER BY "receivedAt" DESC
      LIMIT 50
    `);

    for (const event of events) {
      const checkoutId = event.payload?.checkout?.id;
      if (!checkoutId) continue;

      const checkout = await asaasGateway.getCheckout(checkoutId);
      if (checkout.externalReference !== session.user.id) continue;

      const existing = await prisma.subscription.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (existing) {
        await prisma.subscription.update({
          where: { userId: session.user.id },
          data: {
            status: "ACTIVE",
            plan: "pro",
          },
        });
      } else {
        await prisma.subscription.create({
          data: {
            userId: session.user.id,
            stripeSubscriptionId: `asaas:${checkoutId}`,
            status: "ACTIVE",
            plan: "pro",
            currentPeriodEnd: null,
          },
        });
      }

      return NextResponse.json({
        reconciled: true,
        checkoutId,
        status: "ACTIVE",
      });
    }

    return NextResponse.json(
      {
        reconciled: false,
        error: "Nenhum pagamento aprovado do Asaas foi encontrado para esta conta",
      },
      { status: 404 },
    );
  } catch (error) {
    console.error("[billing.asaas.reconcile]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao sincronizar pagamento" },
      { status: 502 },
    );
  }
}
