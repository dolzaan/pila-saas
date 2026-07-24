import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { asaasGateway } from "@/lib/payments/asaas";

const RequestSchema = z.object({
  billingType: z.enum(["CREDIT_CARD", "PIX", "BOLETO"]).default("CREDIT_CARD"),
});

type PaymentCustomerRow = {
  providerCustomerId: string;
};

function getMonthlyValue(): number {
  const value = Number(process.env.ASAAS_PRO_MONTHLY_VALUE);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("ASAAS_PRO_MONTHLY_VALUE não configurado corretamente");
  }
  return Math.round(value * 100) / 100;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = RequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Forma de pagamento inválida" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      whatsappNumber: true,
      subscription: { select: { currentPeriodEnd: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  try {
    const existingCustomers = await prisma.$queryRaw<PaymentCustomerRow[]>(Prisma.sql`
      SELECT "providerCustomerId"
      FROM "payment_customers"
      WHERE "userId" = ${user.id} AND "provider" = 'ASAAS'
      LIMIT 1
    `);

    let customerId = existingCustomers[0]?.providerCustomerId;
    if (!customerId) {
      const customer = await asaasGateway.createCustomer({
        name: user.name || user.email,
        email: user.email,
        mobilePhone: user.whatsappNumber || undefined,
        externalReference: user.id,
      });
      customerId = customer.id;

      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "payment_customers"
          ("id", "userId", "provider", "providerCustomerId", "createdAt", "updatedAt")
        VALUES
          (${randomUUID()}, ${user.id}, 'ASAAS', ${customerId}, NOW(), NOW())
        ON CONFLICT ("userId", "provider")
        DO UPDATE SET "providerCustomerId" = EXCLUDED."providerCustomerId", "updatedAt" = NOW()
      `);
    }

    const now = new Date();
    const nextDueDate =
      user.subscription?.currentPeriodEnd && user.subscription.currentPeriodEnd > now
        ? user.subscription.currentPeriodEnd
        : now;

    const subscription = await asaasGateway.createSubscription({
      customerId,
      billingType: parsed.data.billingType,
      value: getMonthlyValue(),
      nextDueDate: formatDate(nextDueDate),
      cycle: "MONTHLY",
      description: "Pila Pro - assinatura mensal",
      externalReference: user.id,
    });

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "payment_subscriptions"
        ("id", "userId", "provider", "providerSubscriptionId", "billingType", "status", "nextDueDate", "createdAt", "updatedAt")
      VALUES
        (${randomUUID()}, ${user.id}, 'ASAAS', ${subscription.id}, ${parsed.data.billingType}, ${subscription.status}, ${subscription.nextDueDate ? new Date(subscription.nextDueDate) : null}, NOW(), NOW())
      ON CONFLICT ("userId", "provider")
      DO UPDATE SET
        "providerSubscriptionId" = EXCLUDED."providerSubscriptionId",
        "billingType" = EXCLUDED."billingType",
        "status" = EXCLUDED."status",
        "nextDueDate" = EXCLUDED."nextDueDate",
        "updatedAt" = NOW()
    `);

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      nextDueDate: subscription.nextDueDate,
    });
  } catch (error) {
    console.error("[billing.asaas.subscription]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar assinatura" },
      { status: 502 },
    );
  }
}
