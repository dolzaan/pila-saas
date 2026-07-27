import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { asaasGateway } from "@/lib/payments/asaas";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function hasRepeatedDigits(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || hasRepeatedDigits(cpf)) return false;

  const calculateDigit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || hasRepeatedDigits(cnpj)) return false;

  const calculateDigit = (baseLength: number) => {
    const weights = baseLength === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculateDigit(12) === Number(cnpj[12]) && calculateDigit(13) === Number(cnpj[13]);
}

const RequestSchema = z.object({
  billingType: z.enum(["PIX", "BOLETO"]),
  cpfCnpj: z.string().transform(onlyDigits).refine(
    (value) => isValidCpf(value) || isValidCnpj(value),
    "Informe um CPF ou CNPJ válido",
  ),
});

type PaymentCustomerRow = { providerCustomerId: string };

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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Confira os dados de pagamento" },
      { status: 400 },
    );
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
    const customerData = {
      name: user.name || user.email,
      email: user.email,
      mobilePhone: user.whatsappNumber || undefined,
      cpfCnpj: parsed.data.cpfCnpj,
      externalReference: user.id,
    };

    if (!customerId) {
      const customer = await asaasGateway.createCustomer(customerData);
      customerId = customer.id;

      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "payment_customers"
          ("id", "userId", "provider", "providerCustomerId", "createdAt", "updatedAt")
        VALUES
          (${randomUUID()}, ${user.id}, 'ASAAS', ${customerId}, NOW(), NOW())
        ON CONFLICT ("userId", "provider")
        DO UPDATE SET "providerCustomerId" = EXCLUDED."providerCustomerId", "updatedAt" = NOW()
      `);
    } else {
      await asaasGateway.updateCustomer(customerId, customerData);
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

    const payment = await asaasGateway.getFirstSubscriptionPayment(subscription.id);
    const paymentUrl = payment?.invoiceUrl ?? payment?.bankSlipUrl ?? null;

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      nextDueDate: subscription.nextDueDate,
      paymentUrl,
      billingType: parsed.data.billingType,
    });
  } catch (error) {
    console.error("[billing.asaas.subscription]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar assinatura" },
      { status: 502 },
    );
  }
}
