import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { asaasGateway, isAsaasNotFoundError } from "@/lib/payments/asaas";

type PaymentSubscriptionRow = {
  providerSubscriptionId: string;
  billingType: string;
  status: string;
  nextDueDate: Date | null;
};

async function getSubscription(userId: string): Promise<PaymentSubscriptionRow | null> {
  const rows = await prisma.$queryRaw<PaymentSubscriptionRow[]>(Prisma.sql`
    SELECT "providerSubscriptionId", "billingType", "status", "nextDueDate"
    FROM "payment_subscriptions"
    WHERE "userId" = ${userId} AND "provider" = 'ASAAS'
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const subscription = await getSubscription(session.user.id);
  if (!subscription) {
    return NextResponse.json({ subscription: null });
  }

  try {
    const payment = await asaasGateway.getFirstSubscriptionPayment(
      subscription.providerSubscriptionId,
    );

    return NextResponse.json({
      subscription: {
        billingType: subscription.billingType,
        status: subscription.status,
        nextDueDate: subscription.nextDueDate,
        paymentUrl: payment?.invoiceUrl ?? payment?.bankSlipUrl ?? null,
        paymentStatus: payment?.status ?? null,
      },
    });
  } catch (error) {
    console.error("[billing.asaas.manage.get]", error);
    return NextResponse.json({
      subscription: {
        billingType: subscription.billingType,
        status: subscription.status,
        nextDueDate: subscription.nextDueDate,
        paymentUrl: null,
        paymentStatus: null,
      },
    });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const subscription = await getSubscription(session.user.id);
  if (!subscription) {
    return NextResponse.json({ error: "Assinatura do Asaas não encontrada" }, { status: 404 });
  }

  try {
    await asaasGateway.cancelSubscription(subscription.providerSubscriptionId).catch((error) => {
      if (!isAsaasNotFoundError(error)) throw error;
    });

    await prisma.$transaction([
      prisma.$executeRaw(Prisma.sql`
        UPDATE "payment_subscriptions"
        SET "status" = 'CANCELED', "updatedAt" = NOW()
        WHERE "userId" = ${session.user.id} AND "provider" = 'ASAAS'
      `),
      prisma.subscription.updateMany({
        where: { userId: session.user.id },
        data: { status: "CANCELED" },
      }),
    ]);

    return NextResponse.json({ canceled: true });
  } catch (error) {
    console.error("[billing.asaas.manage.delete]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao cancelar assinatura" },
      { status: 502 },
    );
  }
}
